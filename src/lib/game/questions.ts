import { questionsIn, type Question } from "@/data/questions";

/**
 * Picks the next question for a room.
 * Never repeats within a game; also avoids questions used in earlier games in the
 * same room until the selected categories run out.
 */
export function pickQuestion(
  categories: readonly string[],
  usedThisGame: ReadonlySet<string>,
  usedInRoom: ReadonlySet<string>,
  random: () => number = Math.random,
): Question | null {
  const pool = questionsIn(categories).filter((q) => !usedThisGame.has(q.id));
  if (pool.length === 0) return null;
  const fresh = pool.filter((q) => !usedInRoom.has(q.id));
  const source = fresh.length > 0 ? fresh : pool;
  return source[Math.floor(random() * source.length)] ?? null;
}
