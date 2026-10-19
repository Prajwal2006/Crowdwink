import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_IDS, countByCategory, getQuestion, QUESTIONS, questionsIn } from "@/data/questions";
import { pickQuestion } from "@/lib/game/questions";

describe("question bank", () => {
  it("has at least 150 questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(150);
  });

  it("uses unique ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefixes each id with its category", () => {
    for (const q of QUESTIONS) expect(q.id.startsWith(`${q.category}-`)).toBe(true);
  });

  it("has two distinct, non-empty options and a prompt for every question", () => {
    for (const q of QUESTIONS) {
      expect(q.prompt.trim().length).toBeGreaterThan(5);
      expect(q.a.trim()).not.toBe("");
      expect(q.b.trim()).not.toBe("");
      expect(q.a.toLowerCase()).not.toBe(q.b.toLowerCase());
      expect(q.a.length).toBeLessThanOrEqual(32);
      expect(q.b.length).toBeLessThanOrEqual(32);
    }
  });

  it("has no duplicate prompts", () => {
    const prompts = QUESTIONS.map((q) => q.prompt.toLowerCase());
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("covers every category with enough questions for a 15-round game", () => {
    const counts = countByCategory();
    expect(CATEGORIES.length).toBe(10);
    for (const id of CATEGORY_IDS) expect(counts[id]).toBeGreaterThanOrEqual(15);
  });

  it("looks questions up by id", () => {
    expect(getQuestion("food-001")?.category).toBe("food");
    expect(getQuestion("nope")).toBeUndefined();
  });
});

describe("pickQuestion", () => {
  it("never repeats a question within a game", () => {
    const used = new Set<string>();
    const pool = questionsIn(["food"]);
    for (let i = 0; i < pool.length; i++) {
      const q = pickQuestion(["food"], used, used)!;
      expect(used.has(q.id)).toBe(false);
      expect(q.category).toBe("food");
      used.add(q.id);
    }
    expect(pickQuestion(["food"], used, used)).toBeNull();
  });

  it("prefers questions not used in earlier games in the room", () => {
    const food = questionsIn(["food"]);
    const usedInRoom = new Set(food.slice(0, food.length - 1).map((q) => q.id));
    const q = pickQuestion(["food"], new Set(), usedInRoom);
    expect(q?.id).toBe(food[food.length - 1]!.id);
  });

  it("falls back to earlier-game questions once fresh ones run out", () => {
    const food = questionsIn(["food"]);
    const usedInRoom = new Set(food.map((q) => q.id));
    expect(pickQuestion(["food"], new Set(), usedInRoom)).not.toBeNull();
  });

  it("treats an empty category list as all categories", () => {
    expect(questionsIn([]).length).toBe(QUESTIONS.length);
  });
});
