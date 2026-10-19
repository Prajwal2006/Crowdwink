export type CategoryId =
  | "funny"
  | "food"
  | "school"
  | "lifestyle"
  | "technology"
  | "superpowers"
  | "travel"
  | "entertainment"
  | "hypotheticals"
  | "friends";

export type Question = {
  /** Stable, unique id. Never reuse or renumber ids: rounds in the database reference them. */
  id: string;
  category: CategoryId;
  prompt: string;
  a: string;
  b: string;
};

/** Compact authoring format: [id, prompt, option A, option B]. */
export type QuestionTuple = readonly [id: string, prompt: string, a: string, b: string];

export function defineQuestions(category: CategoryId, rows: readonly QuestionTuple[]): Question[] {
  return rows.map(([id, prompt, a, b]) => ({ id, category, prompt, a, b }));
}
