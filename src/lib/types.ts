import type { CategoryId } from "@/data/questions";
import type { GameMode } from "@/lib/game/modes";

export type { GameMode };

export type Choice = "a" | "b";
export type Outcome = Choice | "tie";
export type RoomStatus = "lobby" | "playing" | "finished";
export type RoundPhase = "answering" | "revealed";

export type RoomSettingsView = {
  name: string;
  rounds: number;
  categories: CategoryId[];
  mode: GameMode;
};

export type PlayerView = {
  id: string;
  nickname: string;
  avatar: number;
  score: number;
  correct: number;
  predicted: number;
  ready: boolean;
  isHost: boolean;
  /** Last time the server heard from this player (epoch ms). */
  lastSeenAt: number;
  joinedAt: number;
};

export type RoundEntry = {
  playerId: string;
  nickname: string;
  avatar: number;
  vote: Choice | null;
  prediction: Choice | null;
  correct: boolean;
  points: number;
};

export type RoundView = {
  id: string;
  number: number;
  phase: RoundPhase;
  startsAt: number;
  deadlineAt: number;
  question: { id: string; category: CategoryId; prompt: string; a: string; b: string };
  /** Who has submitted what. Never includes the actual answers before the reveal. */
  progress: { playerId: string; voted: boolean; predicted: boolean }[];
  myVote: Choice | null;
  myPrediction: Choice | null;
  results: null | {
    votesA: number;
    votesB: number;
    /** The option most people picked. */
    winner: Outcome;
    /** The option a prediction had to match to score: `winner`, flipped in minority mode. */
    target: Outcome;
    entries: RoundEntry[];
  };
};

export type LeaderboardRow = {
  playerId: string;
  nickname: string;
  avatar: number;
  rank: number;
  prevRank: number | null;
  score: number;
  correct: number;
  predicted: number;
  accuracy: number;
};

export type FinalView = {
  roomName: string;
  roundsPlayed: number;
  winnerIds: string[];
  rivals: null | { aId: string; bId: string; gap: number };
};

export type RoomView = {
  serverNow: number;
  version: number;
  room: {
    code: string;
    status: RoomStatus;
    settings: RoomSettingsView;
    gameNumber: number;
    currentRound: number;
    hostId: string | null;
  };
  me: { id: string; nickname: string; isHost: boolean };
  players: PlayerView[];
  round: RoundView | null;
  leaderboard: LeaderboardRow[];
  final: FinalView | null;
};

/** What someone without a seat in the room may see (for the join screen). */
export type RoomPreview = {
  code: string;
  name: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hostName: string | null;
  full: boolean;
};

export type ApiError = { error: { code: string; message: string } };

export type JoinResponse = {
  code: string;
  playerId: string;
  token: string;
  nickname: string;
};

export type GameAction =
  | { type: "heartbeat" }
  | { type: "ready"; ready: boolean }
  | { type: "settings"; settings: Partial<RoomSettingsView> }
  | { type: "kick"; playerId: string }
  | { type: "start" }
  | { type: "vote"; choice: Choice }
  | { type: "predict"; choice: Choice }
  | { type: "reveal" }
  | { type: "next" }
  | { type: "rematch"; mode: "play" | "lobby" }
  | { type: "leave" };
