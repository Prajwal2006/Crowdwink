/**
 * Game modes. Both use the same flow (secret vote, then predict); they differ only in
 * which option a prediction has to land on to score.
 * - majority: predict the option MOST of the room picked (the original game).
 * - minority: predict the option FEWER people picked.
 */
export const GAME_MODES = ["majority", "minority"] as const;
export type GameMode = (typeof GAME_MODES)[number];
export const DEFAULT_MODE: GameMode = "majority";

export const MODE_INFO: Record<
  GameMode,
  {
    emoji: string;
    label: string;
    /** One-line rule, e.g. for pickers and the lobby. */
    rule: string;
    /** How the crowd's pick is described in prompts: "most of the room" / "fewer people". */
    target: string;
    /** Short noun for the scoring side: "majority" / "minority". */
    side: string;
  }
> = {
  majority: {
    emoji: "👥",
    label: "Read the room",
    rule: "Score by predicting the answer MOST people pick.",
    target: "most of the room",
    side: "majority",
  },
  minority: {
    emoji: "🦄",
    label: "Underdog",
    rule: "Score by predicting the answer FEWER people pick.",
    target: "fewer people",
    side: "minority",
  },
};

export function isGameMode(value: unknown): value is GameMode {
  return (GAME_MODES as readonly unknown[]).includes(value);
}

/** Rooms created before modes existed have no mode stored; they play the original game. */
export function modeOf(settings: { mode?: unknown }): GameMode {
  return isGameMode(settings.mode) ? settings.mode : DEFAULT_MODE;
}
