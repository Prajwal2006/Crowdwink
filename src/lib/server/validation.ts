import { z } from "zod";
import { CATEGORY_IDS, questionsIn, type CategoryId } from "@/data/questions";
import { MAX_ROUNDS, NICKNAME_MAX, ROOM_NAME_MAX } from "@/lib/game/constants";
import { GAME_MODES } from "@/lib/game/modes";

/** Letters, numbers, marks, emoji and a few friendly punctuation characters. */
const DISPLAY_TEXT = /^[\p{L}\p{N}\p{M}\p{Extended_Pictographic}‍️ _.'!?&-]+$/u;

function cleanText(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export const nicknameSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .min(1, "Pick a nickname.")
      .refine((v) => [...v].length <= NICKNAME_MAX, `Nicknames can be up to ${NICKNAME_MAX} characters.`)
      .refine((v) => DISPLAY_TEXT.test(v), "Use letters, numbers, emoji, spaces or . _ - ' ! ?"),
  );

export const roomNameSchema = z
  .string()
  .transform(cleanText)
  .pipe(
    z
      .string()
      .refine((v) => [...v].length <= ROOM_NAME_MAX, `Room names can be up to ${ROOM_NAME_MAX} characters.`)
      .refine((v) => v === "" || DISPLAY_TEXT.test(v), "Room names can use letters, numbers, emoji and spaces."),
  );

export const categoriesSchema = z
  .array(z.enum(CATEGORY_IDS as [CategoryId, ...CategoryId[]]))
  .max(CATEGORY_IDS.length)
  .transform((list) => [...new Set(list)]);

export const roundsSchema = z.number().int().min(1).max(MAX_ROUNDS);

export const modeSchema = z.enum(GAME_MODES);

export const createRoomSchema = z.object({
  nickname: nicknameSchema,
  name: roomNameSchema.optional(),
  rounds: roundsSchema.optional(),
  categories: categoriesSchema.optional(),
  mode: modeSchema.optional(),
});

export const joinRoomSchema = z.object({ nickname: nicknameSchema });

const choice = z.enum(["a", "b"]);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heartbeat") }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({
    type: z.literal("settings"),
    settings: z
      .object({ name: roomNameSchema, rounds: roundsSchema, categories: categoriesSchema, mode: modeSchema })
      .partial(),
  }),
  z.object({ type: z.literal("kick"), playerId: z.uuid() }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("vote"), choice }),
  z.object({ type: z.literal("predict"), choice }),
  z.object({ type: z.literal("reveal") }),
  z.object({ type: z.literal("next") }),
  z.object({ type: z.literal("rematch"), mode: z.enum(["play", "lobby"]) }),
  z.object({ type: z.literal("leave") }),
]);

/** Make sure the chosen categories can supply enough unique questions. */
export function assertEnoughQuestions(categories: readonly string[], rounds: number): string | null {
  const available = questionsIn(categories).length;
  if (available < rounds) {
    return `Those categories only have ${available} questions. Pick more categories or fewer rounds.`;
  }
  return null;
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
