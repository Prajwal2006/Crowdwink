import { sql } from "drizzle-orm";
import type { GameMode } from "@/lib/game/modes";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roomStatus = pgEnum("room_status", ["lobby", "playing", "finished"]);
export const roundPhase = pgEnum("round_phase", ["answering", "revealed"]);
export const option = pgEnum("answer_option", ["a", "b"]);
export const roundWinner = pgEnum("round_winner", ["a", "b", "tie"]);

export type RoomSettings = {
  /** Display name for the room, shown on the share card. */
  name: string;
  /** Number of rounds in a game. */
  rounds: number;
  /** Question category ids. Empty means "all categories". */
  categories: string[];
  /** Scoring mode. Missing on rooms created before modes existed: read it with `modeOf`. */
  mode?: GameMode;
};

export type StandingSnapshot = {
  playerId: string;
  nickname: string;
  avatar?: number;
  score: number;
  rank: number;
  correct: number;
  predicted: number;
};

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 12 }).notNull(),
    hostPlayerId: uuid("host_player_id").references((): AnyPgColumn => players.id, {
      onDelete: "set null",
    }),
    settings: jsonb("settings").$type<RoomSettings>().notNull(),
    status: roomStatus("status").notNull().default("lobby"),
    /** Increments on every rematch so rounds/results from older games stay separate. */
    gameNumber: integer("game_number").notNull().default(1),
    currentRound: integer("current_round").notNull().default(0),
    /** Monotonic counter bumped on every state change; clients use it to drop stale updates. */
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rooms_code_key").on(t.code),
    index("rooms_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 24 }).notNull(),
    /** Lower-cased nickname used to block duplicates within a room. */
    nicknameKey: varchar("nickname_key", { length: 24 }).notNull(),
    avatar: smallint("avatar").notNull().default(0),
    /** sha256 of the player's secret session token. The raw token never touches the DB. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    score: integer("score").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    /** Predictions made in rounds that had a majority (ties excluded). Used for accuracy. */
    predictedCount: integer("predicted_count").notNull().default(0),
    ready: boolean("ready").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedReason: varchar("removed_reason", { length: 16 }),
  },
  (t) => [
    index("players_room_idx").on(t.roomId),
    uniqueIndex("players_room_nickname_active_key")
      .on(t.roomId, t.nicknameKey)
      .where(sql`${t.removedAt} is null`),
  ],
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    gameNumber: integer("game_number").notNull(),
    roundNumber: integer("round_number").notNull(),
    /** Reference to a question in the local question bank (src/data/questions). */
    questionId: varchar("question_id", { length: 48 }).notNull(),
    phase: roundPhase("phase").notNull().default("answering"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rounds_room_game_round_key").on(t.roomId, t.gameNumber, t.roundNumber),
    index("rounds_room_question_idx").on(t.roomId, t.questionId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    choice: option("choice").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // Composite primary key = one vote per player per round, enforced by the database.
  (t) => [primaryKey({ columns: [t.roundId, t.playerId] }), index("votes_player_idx").on(t.playerId)],
);

export const predictions = pgTable(
  "predictions",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    predicted: option("predicted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roundId, t.playerId] }),
    index("predictions_player_idx").on(t.playerId),
  ],
);

/**
 * Finalized outcome of a round. The primary key on round_id means a round can be
 * scored at most once, even if two finalization requests race.
 */
export const roundResults = pgTable("round_results", {
  roundId: uuid("round_id")
    .primaryKey()
    .references(() => rounds.id, { onDelete: "cascade" }),
  votesA: integer("votes_a").notNull(),
  votesB: integer("votes_b").notNull(),
  winner: roundWinner("winner").notNull(),
  /** Leaderboard right after this round, used for rank-change arrows. */
  standings: jsonb("standings").$type<StandingSnapshot[]>().notNull(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per completed game, kept for share cards and history. */
export const gameSummaries = pgTable(
  "game_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    gameNumber: integer("game_number").notNull(),
    roomName: text("room_name").notNull(),
    roundsPlayed: integer("rounds_played").notNull(),
    winnerNames: jsonb("winner_names").$type<string[]>().notNull(),
    standings: jsonb("standings").$type<StandingSnapshot[]>().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("game_summaries_room_game_key").on(t.roomId, t.gameNumber)],
);

/** Fixed-window rate-limit counters (works across serverless instances). */
export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 128 }).primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type RoundResult = typeof roundResults.$inferSelect;
export type Option = (typeof option.enumValues)[number];
export type Winner = (typeof roundWinner.enumValues)[number];
