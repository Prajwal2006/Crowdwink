export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const ROUND_OPTIONS = [3, 5, 8, 10, 15] as const;
export const DEFAULT_ROUNDS = 5;
export const MAX_ROUNDS = 15;
export const NICKNAME_MAX = 16;
export const ROOM_NAME_MAX = 32;

/** Countdown shown before every question. */
export const COUNTDOWN_MS = 3_000;
/** Time players have to vote and predict. The host can reveal earlier. */
export const ANSWER_WINDOW_MS = 60_000;

/** A player counts as "connected" if we heard from them within this window. */
export const PRESENCE_WINDOW_MS = 45_000;
/** Players silent for this long stop blocking the round from auto-advancing. */
export const STALL_WINDOW_MS = 60_000;
/** If the host is silent this long, hosting passes to a connected player. */
export const HOST_TIMEOUT_MS = 90_000;
/** Rooms with no activity for this long are expired and later deleted. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

export const HEARTBEAT_MS = 20_000;

export const AVATARS = [
  { emoji: "🦊", color: "#FF8A3D" },
  { emoji: "🐼", color: "#7C83FD" },
  { emoji: "🐸", color: "#3DDC97" },
  { emoji: "🐙", color: "#FF5C8A" },
  { emoji: "🦄", color: "#B26BFF" },
  { emoji: "🐯", color: "#FFC93C" },
  { emoji: "🐧", color: "#38BDF8" },
  { emoji: "🐵", color: "#F97362" },
] as const;
