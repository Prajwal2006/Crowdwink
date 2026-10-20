import { randomInt } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db";
import {
  gameSummaries,
  type Player,
  players,
  predictions,
  type Room,
  type RoomSettings,
  roundResults,
  rooms,
  type Round,
  rounds,
  votes,
} from "@/db/schema";
import { CATEGORY_IDS } from "@/data/questions";
import { generatePlayerToken, generateRoomCode, hashToken, tokenMatches } from "@/lib/game/codes";
import {
  ANSWER_WINDOW_MS,
  AVATARS,
  COUNTDOWN_MS,
  DEFAULT_ROUNDS,
  HOST_TIMEOUT_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PRESENCE_WINDOW_MS,
  ROOM_TTL_MS,
  STALL_WINDOW_MS,
} from "@/lib/game/constants";
import { modeOf, type GameMode } from "@/lib/game/modes";
import { pickQuestion } from "@/lib/game/questions";
import { rankPlayers, scoreRound } from "@/lib/game/scoring";
import type { GameAction, JoinResponse } from "@/lib/types";
import type { PlayerAuth } from "./auth";
import { Errors, GameError } from "./errors";
import { publishSync } from "./realtime";
import { assertEnoughQuestions } from "./validation";

// ───────────────────────────── helpers ─────────────────────────────

const cryptoRandom = () => randomInt(0, 2 ** 31) / 2 ** 31;

export function nicknameKey(nickname: string) {
  return nickname.toLocaleLowerCase("en-US");
}

export function isExpired(room: Pick<Room, "lastActivityAt">, now = Date.now()) {
  return now - room.lastActivityAt.getTime() > ROOM_TTL_MS;
}

function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const candidates = [err, (err as { cause?: unknown })?.cause];
  return candidates.some((e) => {
    const pg = e as { code?: string; constraint?: string } | undefined;
    return pg?.code === "23505" && (!constraint || pg.constraint === constraint);
  });
}

async function lockRoom(tx: Tx, code: string): Promise<Room> {
  const [room] = await tx.select().from(rooms).where(eq(rooms.code, code)).for("update");
  if (!room) throw Errors.roomNotFound();
  if (isExpired(room)) throw Errors.roomExpired();
  return room;
}

async function activePlayers(tx: Tx, roomId: string): Promise<Player[]> {
  return tx
    .select()
    .from(players)
    .where(and(eq(players.roomId, roomId), isNull(players.removedAt)))
    .orderBy(asc(players.joinedAt));
}

async function authenticate(tx: Tx, room: Room, auth: PlayerAuth): Promise<Player> {
  const [player] = await tx
    .select()
    .from(players)
    .where(and(eq(players.id, auth.playerId), eq(players.roomId, room.id)));
  if (!player || !tokenMatches(auth.token, player.tokenHash)) throw Errors.unauthorized();
  if (player.removedAt) {
    throw player.removedReason === "kicked" ? Errors.removed() : Errors.unauthorized();
  }
  return player;
}

async function bump(tx: Tx, roomId: string): Promise<number> {
  const [row] = await tx
    .update(rooms)
    .set({
      version: sql`${rooms.version} + 1`,
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(rooms.id, roomId))
    .returning({ version: rooms.version });
  return row!.version;
}

async function currentRound(tx: Tx, room: Room): Promise<Round | null> {
  if (room.currentRound < 1) return null;
  const [round] = await tx
    .select()
    .from(rounds)
    .where(
      and(
        eq(rounds.roomId, room.id),
        eq(rounds.gameNumber, room.gameNumber),
        eq(rounds.roundNumber, room.currentRound),
      ),
    );
  return round ?? null;
}

function assertHost(room: Room, player: Player) {
  if (room.hostPlayerId !== player.id) throw Errors.hostOnly();
}

function pickNewHost(candidates: Player[], now: number, exclude?: string): Player | null {
  const pool = candidates.filter((p) => p.id !== exclude);
  const online = pool.filter((p) => now - p.lastSeenAt.getTime() < PRESENCE_WINDOW_MS);
  return (online[0] ?? pool[0]) || null;
}

function normalizeSettings(input: Partial<RoomSettings>, fallbackName: string): RoomSettings {
  const categories = (input.categories ?? []).filter((c) =>
    (CATEGORY_IDS as string[]).includes(c),
  );
  return {
    name: input.name?.trim() || fallbackName,
    rounds: input.rounds ?? DEFAULT_ROUNDS,
    // Selecting every category is the same as "all"; store it as [] to keep it simple.
    categories: categories.length === CATEGORY_IDS.length ? [] : categories,
    mode: modeOf(input),
  };
}

// ───────────────────────────── room lifecycle ─────────────────────────────

export async function createRoom(input: {
  nickname: string;
  name?: string;
  rounds?: number;
  categories?: string[];
  mode?: GameMode;
}): Promise<JoinResponse> {
  const settings = normalizeSettings(input, `${input.nickname}'s crowd`);
  const problem = assertEnoughQuestions(settings.categories, settings.rounds);
  if (problem) throw Errors.badRequest(problem);

  const db = getDb();
  const token = generatePlayerToken();

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode();
    try {
      return await db.transaction(async (tx) => {
        const [room] = await tx.insert(rooms).values({ code, settings }).returning();
        const [player] = await tx
          .insert(players)
          .values({
            roomId: room!.id,
            nickname: input.nickname,
            nicknameKey: nicknameKey(input.nickname),
            avatar: randomInt(AVATARS.length),
            tokenHash: hashToken(token),
          })
          .returning();
        await tx.update(rooms).set({ hostPlayerId: player!.id }).where(eq(rooms.id, room!.id));
        return { code, playerId: player!.id, token, nickname: player!.nickname };
      });
    } catch (err) {
      if (isUniqueViolation(err, "rooms_code_key")) continue; // astronomically rare; retry
      throw err;
    }
  }
  throw new GameError(503, "code_exhausted", "Couldn't create a room right now. Please try again.");
}

export async function joinRoom(code: string, nickname: string): Promise<JoinResponse> {
  const db = getDb();
  const token = generatePlayerToken();
  try {
    const { result, version } = await db.transaction(async (tx) => {
      const room = await lockRoom(tx, code);
      const active = await activePlayers(tx, room.id);
      if (active.length >= MAX_PLAYERS) throw Errors.roomFull(MAX_PLAYERS);
      const key = nicknameKey(nickname);
      if (active.some((p) => p.nicknameKey === key)) throw Errors.nicknameTaken();

      const used = new Set(active.map((p) => p.avatar));
      const free = AVATARS.map((_, i) => i).filter((i) => !used.has(i));
      const avatar = free.length ? free[randomInt(free.length)]! : randomInt(AVATARS.length);

      const [player] = await tx
        .insert(players)
        .values({ roomId: room.id, nickname, nicknameKey: key, avatar, tokenHash: hashToken(token) })
        .returning();
      // A room can lose its host if everyone left; the newcomer takes over.
      if (!room.hostPlayerId || !active.some((p) => p.id === room.hostPlayerId)) {
        await tx.update(rooms).set({ hostPlayerId: player!.id }).where(eq(rooms.id, room.id));
      }
      const version = await bump(tx, room.id);
      return { result: { code, playerId: player!.id, token, nickname: player!.nickname }, version };
    });
    await publishSync(code, version);
    return result;
  } catch (err) {
    if (isUniqueViolation(err, "players_room_nickname_active_key")) throw Errors.nicknameTaken();
    throw err;
  }
}

// ───────────────────────────── rounds & scoring ─────────────────────────────

async function startRound(tx: Tx, room: Room, roundNumber: number, now: number) {
  const usedRows = await tx
    .select({ questionId: rounds.questionId, gameNumber: rounds.gameNumber })
    .from(rounds)
    .where(eq(rounds.roomId, room.id));
  const usedThisGame = new Set(
    usedRows.filter((r) => r.gameNumber === room.gameNumber).map((r) => r.questionId),
  );
  const usedInRoom = new Set(usedRows.map((r) => r.questionId));
  const question = pickQuestion(room.settings.categories, usedThisGame, usedInRoom, cryptoRandom);
  if (!question) throw Errors.badRequest("We ran out of questions for these categories.");

  const startsAt = new Date(now + COUNTDOWN_MS);
  const deadlineAt = new Date(now + COUNTDOWN_MS + ANSWER_WINDOW_MS);
  await tx.insert(rounds).values({
    roomId: room.id,
    gameNumber: room.gameNumber,
    roundNumber,
    questionId: question.id,
    startsAt,
    deadlineAt,
  });
  await tx
    .update(rooms)
    .set({ status: "playing", currentRound: roundNumber })
    .where(eq(rooms.id, room.id));
  await tx.update(players).set({ ready: false }).where(eq(players.roomId, room.id));
}

/**
 * Scores a round exactly once. Safe to call repeatedly: the round row is locked and
 * only an `answering` round is scored; round_results' primary key is a second guard.
 */
async function finalizeRound(tx: Tx, roundId: string): Promise<boolean> {
  const [round] = await tx.select().from(rounds).where(eq(rounds.id, roundId)).for("update");
  if (!round || round.phase !== "answering") return false;

  // Only players still in the room count toward the majority and earn points.
  const voteRows = await tx
    .select({ playerId: votes.playerId, choice: votes.choice })
    .from(votes)
    .innerJoin(players, eq(players.id, votes.playerId))
    .where(and(eq(votes.roundId, roundId), isNull(players.removedAt)));
  const predictionRows = await tx
    .select({ playerId: predictions.playerId, predicted: predictions.predicted })
    .from(predictions)
    .innerJoin(players, eq(players.id, predictions.playerId))
    .where(and(eq(predictions.roundId, roundId), isNull(players.removedAt)));

  const [room] = await tx.select({ settings: rooms.settings }).from(rooms).where(eq(rooms.id, round.roomId));
  const outcome = scoreRound(voteRows, predictionRows, modeOf(room?.settings ?? {}));

  for (const award of outcome.awards) {
    if (!award.points && !award.counted) continue;
    await tx
      .update(players)
      .set({
        score: sql`${players.score} + ${award.points}`,
        correctCount: sql`${players.correctCount} + ${award.correct ? 1 : 0}`,
        predictedCount: sql`${players.predictedCount} + ${award.counted ? 1 : 0}`,
      })
      .where(eq(players.id, award.playerId));
  }

  const roster = await activePlayers(tx, round.roomId);
  const standings = rankPlayers(roster).map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    rank: p.rank,
    correct: p.correctCount,
    predicted: p.predictedCount,
  }));

  await tx.insert(roundResults).values({
    roundId,
    votesA: outcome.votesA,
    votesB: outcome.votesB,
    winner: outcome.winner,
    standings,
  });
  await tx
    .update(rounds)
    .set({ phase: "revealed", revealedAt: new Date() })
    .where(eq(rounds.id, roundId));
  await tx.update(players).set({ ready: false }).where(eq(players.roomId, round.roomId));
  return true;
}

/** Ends the round when every active, present player has voted and predicted, or time is up. */
async function maybeFinalize(tx: Tx, room: Room, now: number): Promise<boolean> {
  if (room.status !== "playing") return false;
  const round = await currentRound(tx, room);
  if (!round || round.phase !== "answering") return false;
  if (now >= round.deadlineAt.getTime()) return finalizeRound(tx, round.id);

  const roster = await activePlayers(tx, room.id);
  const voted = new Set(
    (await tx.select({ id: votes.playerId }).from(votes).where(eq(votes.roundId, round.id))).map((r) => r.id),
  );
  const predicted = new Set(
    (
      await tx.select({ id: predictions.playerId }).from(predictions).where(eq(predictions.roundId, round.id))
    ).map((r) => r.id),
  );
  // Someone who closed the tab long ago shouldn't hold everybody hostage.
  const required = roster.filter(
    (p) => voted.has(p.id) || now - p.lastSeenAt.getTime() < STALL_WINDOW_MS,
  );
  if (required.length === 0) return false;
  const everyoneDone = required.every((p) => voted.has(p.id) && predicted.has(p.id));
  return everyoneDone ? finalizeRound(tx, round.id) : false;
}

async function finishGame(tx: Tx, room: Room) {
  const roster = await activePlayers(tx, room.id);
  const ranked = rankPlayers(roster);
  const standings = ranked.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    rank: p.rank,
    correct: p.correctCount,
    predicted: p.predictedCount,
  }));
  const winnerNames = ranked.filter((p) => p.rank === 1).map((p) => p.nickname);
  await tx
    .insert(gameSummaries)
    .values({
      roomId: room.id,
      gameNumber: room.gameNumber,
      roomName: room.settings.name,
      roundsPlayed: room.currentRound,
      winnerNames,
      standings,
    })
    .onConflictDoNothing();
  await tx.update(rooms).set({ status: "finished" }).where(eq(rooms.id, room.id));
  await tx.update(players).set({ ready: false }).where(eq(players.roomId, room.id));
}

async function resetScores(tx: Tx, roomId: string) {
  await tx
    .update(players)
    .set({ score: 0, correctCount: 0, predictedCount: 0, ready: false })
    .where(eq(players.roomId, roomId));
}

async function removePlayer(tx: Tx, room: Room, target: Player, reason: "kicked" | "left", now: number) {
  await tx
    .update(players)
    .set({ removedAt: new Date(now), removedReason: reason, ready: false })
    .where(eq(players.id, target.id));
  if (room.hostPlayerId === target.id) {
    const remaining = await activePlayers(tx, room.id);
    const next = pickNewHost(remaining, now);
    await tx.update(rooms).set({ hostPlayerId: next?.id ?? null }).where(eq(rooms.id, room.id));
    room.hostPlayerId = next?.id ?? null;
  }
}

/**
 * Housekeeping that any request may trigger: ends rounds whose timer ran out and
 * hands hosting to someone present if the host vanished.
 */
async function housekeeping(tx: Tx, room: Room, actor: Player, now: number): Promise<boolean> {
  let changed = false;
  if (room.hostPlayerId && room.hostPlayerId !== actor.id) {
    const [host] = await tx.select().from(players).where(eq(players.id, room.hostPlayerId));
    if (!host || host.removedAt || now - host.lastSeenAt.getTime() > HOST_TIMEOUT_MS) {
      const roster = await activePlayers(tx, room.id);
      const next = pickNewHost(roster, now, room.hostPlayerId);
      if (next) {
        await tx.update(rooms).set({ hostPlayerId: next.id }).where(eq(rooms.id, room.id));
        room.hostPlayerId = next.id;
        changed = true;
      }
    }
  }
  if (await maybeFinalize(tx, room, now)) changed = true;
  return changed;
}

// ───────────────────────────── actions ─────────────────────────────

export type ActionResult = { version: number; changed: boolean };

export async function performAction(code: string, auth: PlayerAuth, action: GameAction): Promise<ActionResult> {
  const db = getDb();
  const now = Date.now();

  const result = await db.transaction(async (tx): Promise<ActionResult> => {
    const room = await lockRoom(tx, code);
    const me = await authenticate(tx, room, auth);
    await tx.update(players).set({ lastSeenAt: new Date(now) }).where(eq(players.id, me.id));
    me.lastSeenAt = new Date(now);

    let changed = false;

    switch (action.type) {
      case "heartbeat": {
        changed = await housekeeping(tx, room, me, now);
        break;
      }

      case "ready": {
        const round = await currentRound(tx, room);
        const canReady = room.status === "lobby" || room.status === "finished" || round?.phase === "revealed";
        if (!canReady) throw Errors.badRequest("You can't change ready status right now.");
        if (me.ready !== action.ready) {
          await tx.update(players).set({ ready: action.ready }).where(eq(players.id, me.id));
          changed = true;
        }
        break;
      }

      case "settings": {
        assertHost(room, me);
        if (room.status !== "lobby") throw Errors.badRequest("Settings can only change in the lobby.");
        const next = normalizeSettings({ ...room.settings, ...action.settings }, room.settings.name);
        const problem = assertEnoughQuestions(next.categories, next.rounds);
        if (problem) throw Errors.badRequest(problem);
        await tx.update(rooms).set({ settings: next }).where(eq(rooms.id, room.id));
        changed = true;
        break;
      }

      case "kick": {
        assertHost(room, me);
        if (action.playerId === me.id) throw Errors.badRequest("You can't remove yourself. Use Leave instead.");
        const [target] = await tx
          .select()
          .from(players)
          .where(and(eq(players.id, action.playerId), eq(players.roomId, room.id), isNull(players.removedAt)));
        if (!target) throw Errors.badRequest("That player isn't in the room anymore.");
        await removePlayer(tx, room, target, "kicked", now);
        await maybeFinalize(tx, room, now);
        changed = true;
        break;
      }

      case "start": {
        assertHost(room, me);
        if (room.status !== "lobby") throw Errors.badRequest("The game has already started.");
        const roster = await activePlayers(tx, room.id);
        if (roster.length < MIN_PLAYERS) {
          throw Errors.badRequest(`You need at least ${MIN_PLAYERS} players to start.`);
        }
        const problem = assertEnoughQuestions(room.settings.categories, room.settings.rounds);
        if (problem) throw Errors.badRequest(problem);
        await resetScores(tx, room.id);
        await startRound(tx, room, 1, now);
        changed = true;
        break;
      }

      case "vote":
      case "predict": {
        if (room.status !== "playing") throw Errors.badRequest("There's no question to answer right now.");
        const round = await currentRound(tx, room);
        if (!round || round.phase !== "answering") {
          throw Errors.conflict("round_closed", "This round is already closed.");
        }
        if (now < round.startsAt.getTime() - 1_000) {
          throw Errors.badRequest("Hold on, the question isn't open yet.");
        }
        if (now > round.deadlineAt.getTime()) {
          await finalizeRound(tx, round.id);
          changed = true;
          break;
        }
        if (action.type === "vote") {
          const inserted = await tx
            .insert(votes)
            .values({ roundId: round.id, playerId: me.id, choice: action.choice })
            .onConflictDoNothing()
            .returning({ playerId: votes.playerId });
          if (inserted.length === 0) {
            throw Errors.conflict("already_voted", "Your vote is already locked in.");
          }
        } else {
          const [myVote] = await tx
            .select({ choice: votes.choice })
            .from(votes)
            .where(and(eq(votes.roundId, round.id), eq(votes.playerId, me.id)));
          if (!myVote) throw Errors.badRequest("Cast your own vote before predicting the crowd.");
          const inserted = await tx
            .insert(predictions)
            .values({ roundId: round.id, playerId: me.id, predicted: action.choice })
            .onConflictDoNothing()
            .returning({ playerId: predictions.playerId });
          if (inserted.length === 0) {
            throw Errors.conflict("already_predicted", "Your prediction is already locked in.");
          }
        }
        await maybeFinalize(tx, room, now);
        changed = true;
        break;
      }

      case "reveal": {
        assertHost(room, me);
        const round = room.status === "playing" ? await currentRound(tx, room) : null;
        if (!round || round.phase !== "answering") throw Errors.badRequest("There's nothing to reveal.");
        if (now < round.startsAt.getTime()) throw Errors.badRequest("The question hasn't opened yet.");
        changed = await finalizeRound(tx, round.id);
        break;
      }

      case "next": {
        assertHost(room, me);
        if (room.status !== "playing") throw Errors.badRequest("No game in progress.");
        const round = await currentRound(tx, room);
        if (!round || round.phase !== "revealed") {
          throw Errors.badRequest("Wait for this round's results first.");
        }
        if (room.currentRound >= room.settings.rounds) {
          await finishGame(tx, room);
        } else {
          await startRound(tx, room, room.currentRound + 1, now);
        }
        changed = true;
        break;
      }

      case "rematch": {
        assertHost(room, me);
        if (room.status === "lobby") throw Errors.badRequest("You're already in the lobby.");
        const roster = await activePlayers(tx, room.id);
        const nextGame = room.gameNumber + 1;
        await resetScores(tx, room.id);
        await tx
          .update(rooms)
          .set({ gameNumber: nextGame, currentRound: 0, status: "lobby" })
          .where(eq(rooms.id, room.id));
        room.gameNumber = nextGame;
        room.currentRound = 0;
        room.status = "lobby";
        if (action.mode === "play" && roster.length >= MIN_PLAYERS) {
          await startRound(tx, room, 1, now);
        }
        changed = true;
        break;
      }

      case "leave": {
        await removePlayer(tx, room, me, "left", now);
        await maybeFinalize(tx, room, now);
        changed = true;
        break;
      }
    }

    const version = changed ? await bump(tx, room.id) : room.version;
    return { version, changed };
  });

  if (result.changed) await publishSync(code, result.version);
  return result;
}

/**
 * Called before building a view. If a round's timer has expired (or the host vanished)
 * we resolve it now, so a stalled room recovers as soon as anyone looks at it.
 */
export async function tickIfDue(code: string, auth: PlayerAuth, room: Room): Promise<boolean> {
  const now = Date.now();
  if (room.status !== "playing") return false;
  const db = getDb();
  const round = await currentRound(db as unknown as Tx, room);
  if (!round || round.phase !== "answering" || now < round.deadlineAt.getTime()) return false;
  const res = await performAction(code, auth, { type: "heartbeat" });
  return res.changed;
}
