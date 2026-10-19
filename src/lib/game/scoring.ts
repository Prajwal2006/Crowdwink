/**
 * Pure, deterministic scoring rules. No I/O here so it is easy to test.
 *
 * - Each player votes for A or B and predicts which option gets more votes.
 * - The majority is computed from every submitted vote, including your own.
 * - Correct prediction: +1 point. Wrong or missing prediction: 0.
 * - Exact tie: nobody scores that round.
 */
export type Choice = "a" | "b";
export type Outcome = Choice | "tie";

export type VoteRow = { playerId: string; choice: Choice };
export type PredictionRow = { playerId: string; predicted: Choice };

export type Tally = {
  votesA: number;
  votesB: number;
  winner: Outcome;
};

export function tallyVotes(votes: readonly VoteRow[]): Tally {
  let votesA = 0;
  let votesB = 0;
  for (const v of votes) {
    if (v.choice === "a") votesA++;
    else votesB++;
  }
  const winner: Outcome = votesA === votesB ? "tie" : votesA > votesB ? "a" : "b";
  return { votesA, votesB, winner };
}

export function pointsFor(prediction: Choice | null | undefined, winner: Outcome): number {
  if (!prediction || winner === "tie") return 0;
  return prediction === winner ? 1 : 0;
}

export type Award = {
  playerId: string;
  points: number;
  correct: boolean;
  /** Whether this prediction counts toward accuracy (ties are excluded). */
  counted: boolean;
};

export function scoreRound(votes: readonly VoteRow[], predictions: readonly PredictionRow[]) {
  const tally = tallyVotes(votes);
  const awards: Award[] = predictions.map((p) => {
    const points = pointsFor(p.predicted, tally.winner);
    return {
      playerId: p.playerId,
      points,
      correct: points > 0,
      counted: tally.winner !== "tie",
    };
  });
  return { ...tally, awards };
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export type Rankable = { id: string; score: number; nickname: string };

/**
 * Competition ranking ("1, 1, 3"): equal scores share a rank.
 * Order within equal scores is alphabetical so lists are stable.
 */
export function rankPlayers<T extends Rankable>(list: readonly T[]): (T & { rank: number })[] {
  const sorted = [...list].sort(
    (x, y) => y.score - x.score || x.nickname.localeCompare(y.nickname, undefined, { sensitivity: "base" }),
  );
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((p, i) => {
    const rank = p.score === lastScore ? lastRank : i + 1;
    lastScore = p.score;
    lastRank = rank;
    return { ...p, rank };
  });
}

/** The adjacent pair in the final standings with the smallest point gap. */
export function closestRivals<T extends Rankable>(ranked: readonly T[]): { a: T; b: T; gap: number } | null {
  let best: { a: T; b: T; gap: number } | null = null;
  for (let i = 0; i < ranked.length - 1; i++) {
    const gap = ranked[i].score - ranked[i + 1].score;
    if (!best || gap < best.gap) best = { a: ranked[i], b: ranked[i + 1], gap };
  }
  return best;
}
