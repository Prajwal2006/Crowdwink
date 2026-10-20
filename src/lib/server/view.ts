import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  gameSummaries,
  players,
  predictions,
  type Room,
  roundResults,
  rooms,
  rounds,
  type StandingSnapshot,
  votes,
} from "@/db/schema";
import { getQuestion, type CategoryId } from "@/data/questions";
import { tokenMatches } from "@/lib/game/codes";
import { MAX_PLAYERS } from "@/lib/game/constants";
import { closestRivals, percent, pointsFor, rankPlayers } from "@/lib/game/scoring";
import type { LeaderboardRow, PlayerView, RoomPreview, RoomView, RoundView } from "@/lib/types";
import type { PlayerAuth } from "./auth";
import { Errors } from "./errors";
import { isExpired, tickIfDue } from "./engine";

const LAST_SEEN_WRITE_INTERVAL_MS = 15_000;

async function loadRoom(code: string): Promise<Room> {
  const db = getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
  if (!room) throw Errors.roomNotFound();
  if (isExpired(room)) throw Errors.roomExpired();
  return room;
}

export async function getPreview(code: string): Promise<RoomPreview> {
  const db = getDb();
  const room = await loadRoom(code);
  const roster = await db
    .select({ id: players.id, nickname: players.nickname })
    .from(players)
    .where(and(eq(players.roomId, room.id), isNull(players.removedAt)));
  const host = roster.find((p) => p.id === room.hostPlayerId);
  return {
    code: room.code,
    name: room.settings.name,
    status: room.status,
    playerCount: roster.length,
    maxPlayers: MAX_PLAYERS,
    hostName: host?.nickname ?? null,
    full: roster.length >= MAX_PLAYERS,
  };
}

export async function getView(code: string, auth: PlayerAuth): Promise<RoomView> {
  const db = getDb();
  let room = await loadRoom(code);

  const [me] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, auth.playerId), eq(players.roomId, room.id)));
  if (!me || !tokenMatches(auth.token, me.tokenHash)) throw Errors.unauthorized();
  if (me.removedAt) throw me.removedReason === "kicked" ? Errors.removed() : Errors.unauthorized();

  // Resolve an expired timer before showing anything.
  if (await tickIfDue(code, auth, room)) room = await loadRoom(code);

  const now = Date.now();
  if (now - me.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    await db.update(players).set({ lastSeenAt: new Date(now) }).where(eq(players.id, me.id));
  }

  const roster = await db
    .select()
    .from(players)
    .where(and(eq(players.roomId, room.id), isNull(players.removedAt)))
    .orderBy(players.joinedAt);

  const playerViews: PlayerView[] = roster.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    score: p.score,
    correct: p.correctCount,
    predicted: p.predictedCount,
    ready: p.ready,
    isHost: p.id === room.hostPlayerId,
    lastSeenAt: p.id === me.id ? now : p.lastSeenAt.getTime(),
    joinedAt: p.joinedAt.getTime(),
  }));

  // ── current round ──
  let roundView: RoundView | null = null;
  if (room.currentRound > 0) {
    const [round] = await db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.roomId, room.id),
          eq(rounds.gameNumber, room.gameNumber),
          eq(rounds.roundNumber, room.currentRound),
        ),
      );
    const question = round ? getQuestion(round.questionId) : undefined;
    if (round) {
      const [voteRows, predictionRows] = await Promise.all([
        db.select().from(votes).where(eq(votes.roundId, round.id)),
        db.select().from(predictions).where(eq(predictions.roundId, round.id)),
      ]);
      const voteBy = new Map(voteRows.map((v) => [v.playerId, v.choice]));
      const predictionBy = new Map(predictionRows.map((p) => [p.playerId, p.predicted]));

      let results: RoundView["results"] = null;
      if (round.phase === "revealed") {
        const [result] = await db.select().from(roundResults).where(eq(roundResults.roundId, round.id));
        if (result) {
          results = {
            votesA: result.votesA,
            votesB: result.votesB,
            winner: result.winner,
            entries: roster.map((p) => {
              const prediction = predictionBy.get(p.id) ?? null;
              const points = pointsFor(prediction, result.winner);
              return {
                playerId: p.id,
                nickname: p.nickname,
                avatar: p.avatar,
                vote: voteBy.get(p.id) ?? null,
                prediction,
                correct: points > 0,
                points,
              };
            }),
          };
        }
      }

      roundView = {
        id: round.id,
        number: round.roundNumber,
        phase: round.phase,
        startsAt: round.startsAt.getTime(),
        deadlineAt: round.deadlineAt.getTime(),
        question: question
          ? { id: question.id, category: question.category, prompt: question.prompt, a: question.a, b: question.b }
          : {
              id: round.questionId,
              category: "hypotheticals" as CategoryId,
              prompt: "This question was removed from the question bank.",
              a: "Option A",
              b: "Option B",
            },
        progress: roster.map((p) => ({
          playerId: p.id,
          voted: voteBy.has(p.id),
          predicted: predictionBy.has(p.id),
        })),
        // Your own answers are always visible to you; everyone else's only after the reveal.
        myVote: voteBy.get(me.id) ?? null,
        myPrediction: predictionBy.get(me.id) ?? null,
        results,
      };
    }
  }

  // ── leaderboard with rank changes ──
  const snapshots = await db
    .select({ roundNumber: rounds.roundNumber, standings: roundResults.standings })
    .from(roundResults)
    .innerJoin(rounds, eq(rounds.id, roundResults.roundId))
    .where(and(eq(rounds.roomId, room.id), eq(rounds.gameNumber, room.gameNumber)))
    .orderBy(desc(rounds.roundNumber))
    .limit(2);
  const previous: StandingSnapshot[] | undefined = snapshots[1]?.standings;
  const prevRankBy = new Map(previous?.map((s) => [s.playerId, s.rank]));

  const leaderboard: LeaderboardRow[] = rankPlayers(
    roster.map((p) => ({ ...p, id: p.id, score: p.score, nickname: p.nickname })),
  ).map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    avatar: p.avatar,
    rank: p.rank,
    prevRank: snapshots.length >= 2 ? (prevRankBy.get(p.id) ?? null) : null,
    score: p.score,
    correct: p.correctCount,
    predicted: p.predictedCount,
    accuracy: percent(p.correctCount, p.predictedCount),
  }));

  // ── final results ──
  let final: RoomView["final"] = null;
  if (room.status === "finished") {
    const [summary] = await db
      .select()
      .from(gameSummaries)
      .where(and(eq(gameSummaries.roomId, room.id), eq(gameSummaries.gameNumber, room.gameNumber)));
    const topScore = leaderboard[0]?.score ?? 0;
    const rivals = closestRivals(leaderboard.map((r) => ({ ...r, id: r.playerId })));
    final = {
      roomName: summary?.roomName ?? room.settings.name,
      roundsPlayed: summary?.roundsPlayed ?? room.currentRound,
      winnerIds: leaderboard.filter((r) => r.score === topScore && topScore > 0).map((r) => r.playerId),
      rivals: rivals ? { aId: rivals.a.playerId, bId: rivals.b.playerId, gap: rivals.gap } : null,
    };
  }

  return {
    serverNow: Date.now(),
    version: room.version,
    room: {
      code: room.code,
      status: room.status,
      settings: {
        name: room.settings.name,
        rounds: room.settings.rounds,
        categories: room.settings.categories as CategoryId[],
      },
      gameNumber: room.gameNumber,
      currentRound: room.currentRound,
      hostId: room.hostPlayerId,
    },
    me: { id: me.id, nickname: me.nickname, isHost: me.id === room.hostPlayerId },
    players: playerViews,
    round: roundView,
    leaderboard,
    final,
  };
}

/** Used by the realtime auth and version endpoints to confirm a player belongs to a room. */
export async function verifyMembership(code: string, auth: PlayerAuth) {
  const db = getDb();
  const room = await loadRoom(code);
  const [me] = await db
    .select({ id: players.id, nickname: players.nickname, tokenHash: players.tokenHash })
    .from(players)
    .where(and(eq(players.id, auth.playerId), eq(players.roomId, room.id), isNull(players.removedAt)));
  if (!me || !tokenMatches(auth.token, me.tokenHash)) throw Errors.unauthorized();
  return { playerId: me.id, nickname: me.nickname, version: room.version };
}

export async function getSummary(code: string, gameNumber: number) {
  const db = getDb();
  const [room] = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code));
  if (!room) return null;
  const [summary] = await db
    .select()
    .from(gameSummaries)
    .where(and(eq(gameSummaries.roomId, room.id), eq(gameSummaries.gameNumber, gameNumber)));
  return summary ?? null;
}

