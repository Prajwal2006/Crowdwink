import { describe, expect, it } from "vitest";
import {
  generatePlayerToken,
  generateRoomCode,
  hashToken,
  isValidRoomCode,
  normalizeRoomCode,
  tokenMatches,
} from "@/lib/game/codes";
import { parseCredential } from "@/lib/server/auth";
import { actionSchema, assertEnoughQuestions, createRoomSchema, nicknameSchema } from "@/lib/server/validation";

describe("room codes", () => {
  it("generates valid, varied codes", () => {
    const codes = new Set(Array.from({ length: 500 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(495);
    for (const c of codes) expect(isValidRoomCode(c)).toBe(true);
  });
  it("normalizes user input", () => {
    expect(normalizeRoomCode(" k7p-q2m ")).toBe("K7PQ2M");
  });
  it("rejects ambiguous characters", () => {
    expect(isValidRoomCode("ABCD0O")).toBe(false);
    expect(isValidRoomCode("ABCDE1")).toBe(false);
  });
});

describe("player tokens", () => {
  it("verifies against the stored hash only", () => {
    const token = generatePlayerToken();
    const hash = hashToken(token);
    expect(tokenMatches(token, hash)).toBe(true);
    expect(tokenMatches(generatePlayerToken(), hash)).toBe(false);
  });
  it("parses bearer credentials", () => {
    const token = generatePlayerToken();
    const id = "0b5e3a7c-1d2f-4a6b-9c8d-7e6f5a4b3c2d";
    expect(parseCredential(`Bearer ${id}.${token}`)).toEqual({ playerId: id, token });
    expect(parseCredential("Bearer garbage")).toBeNull();
    expect(parseCredential(null)).toBeNull();
  });
});

describe("validation", () => {
  it("cleans nicknames", () => {
    expect(nicknameSchema.parse("  Sam   🌮 ")).toBe("Sam 🌮");
  });
  it("rejects empty, long or odd nicknames", () => {
    expect(nicknameSchema.safeParse("   ").success).toBe(false);
    expect(nicknameSchema.safeParse("x".repeat(17)).success).toBe(false);
    expect(nicknameSchema.safeParse("<script>").success).toBe(false);
  });
  it("rejects unknown categories and silly round counts", () => {
    expect(createRoomSchema.safeParse({ nickname: "A", categories: ["nope"] }).success).toBe(false);
    expect(createRoomSchema.safeParse({ nickname: "A", rounds: 0 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ nickname: "A", rounds: 99 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ nickname: "A", mode: "minority" }).success).toBe(true);
    expect(createRoomSchema.safeParse({ nickname: "A", mode: "chaos" }).success).toBe(false);
    expect(actionSchema.safeParse({ type: "settings", settings: { mode: "minority" } }).success).toBe(true);
    expect(actionSchema.safeParse({ type: "settings", settings: { mode: "chaos" } }).success).toBe(false);
  });
  it("does not accept client-supplied scores in actions", () => {
    const parsed = actionSchema.safeParse({ type: "vote", choice: "a", score: 100 });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ type: "vote", choice: "a" });
    expect(actionSchema.safeParse({ type: "setScore", score: 100 }).success).toBe(false);
  });
  it("checks there are enough questions", () => {
    expect(assertEnoughQuestions(["food"], 5)).toBeNull();
    expect(assertEnoughQuestions(["food"], 30)).toMatch(/only have/);
  });
});
