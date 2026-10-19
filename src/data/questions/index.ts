import entertainment from "./entertainment";
import food from "./food";
import friends from "./friends";
import funny from "./funny";
import hypotheticals from "./hypotheticals";
import lifestyle from "./lifestyle";
import school from "./school";
import superpowers from "./superpowers";
import technology from "./technology";
import travel from "./travel";
import type { CategoryId, Question } from "./types";

export * from "./categories";
export type { CategoryId, Question } from "./types";

/**
 * The full question bank. To add questions, append rows to a category file
 * (or add a new file and list it here). The game engine needs no changes.
 */
export const QUESTIONS: Question[] = [
  ...funny,
  ...food,
  ...school,
  ...lifestyle,
  ...technology,
  ...superpowers,
  ...travel,
  ...entertainment,
  ...hypotheticals,
  ...friends,
];

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function questionsIn(categories: readonly string[]): Question[] {
  if (categories.length === 0) return QUESTIONS;
  const set = new Set(categories);
  return QUESTIONS.filter((q) => set.has(q.category));
}

export function countByCategory(): Record<CategoryId, number> {
  const counts = {} as Record<CategoryId, number>;
  for (const q of QUESTIONS) counts[q.category] = (counts[q.category] ?? 0) + 1;
  return counts;
}
