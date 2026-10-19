import { Errors } from "./errors";

export type PlayerAuth = { playerId: string; token: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

/** Credentials look like `<playerId>.<token>`; the token is the secret half. */
export function parseCredential(raw: string | null | undefined): PlayerAuth | null {
  if (!raw) return null;
  const value = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  const playerId = value.slice(0, dot);
  const token = value.slice(dot + 1);
  if (!UUID.test(playerId) || !TOKEN.test(token)) return null;
  return { playerId, token };
}

export function authFromRequest(req: Request): PlayerAuth | null {
  return parseCredential(req.headers.get("authorization"));
}

export function requireAuth(req: Request): PlayerAuth {
  const auth = authFromRequest(req);
  if (!auth) throw Errors.unauthorized();
  return auth;
}
