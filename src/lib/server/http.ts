import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/game/codes";
import { Errors, GameError } from "./errors";
import { firstIssue } from "./validation";

export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function errorResponse(err: unknown) {
  // Let Next.js handle its own control-flow errors (prerender bail-outs, redirects).
  unstable_rethrow(err);
  if (err instanceof GameError) {
    return json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return json({ error: { code: "invalid_input", message: firstIssue(err) } }, { status: 400 });
  }
  console.error("[api] unexpected error", err);
  return json(
    { error: { code: "server_error", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 10_000) throw Errors.badRequest("Request too large.");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw Errors.badRequest("Invalid JSON.");
  }
}

export function roomCodeParam(raw: string): string {
  const code = normalizeRoomCode(decodeURIComponent(raw));
  if (!isValidRoomCode(code)) throw Errors.roomNotFound();
  return code;
}
