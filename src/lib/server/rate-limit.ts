import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { Errors } from "./errors";

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function ipKey(req: Request): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "crowdwink";
  return createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex").slice(0, 32);
}

/**
 * Fixed-window counter stored in Postgres so limits hold across serverless instances.
 * Returns true when the request is allowed.
 */
export async function hit(bucket: string, req: Request, limit: number, windowMs: number): Promise<boolean> {
  const key = `${bucket}:${ipKey(req)}`;
  const seconds = Math.ceil(windowMs / 1000);
  const db = getDb();
  const result = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${seconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at <= now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at <= now()
        then now() + make_interval(secs => ${seconds}) else rate_limits.reset_at end
    returning count
  `);
  const count = Number(result.rows[0]?.count ?? 0);
  return count <= limit;
}

export async function enforce(bucket: string, req: Request, limit: number, windowMs: number) {
  if (process.env.DISABLE_RATE_LIMIT === "1") return;
  if (!(await hit(bucket, req, limit, windowMs))) throw Errors.rateLimited();
}

export const LIMITS = {
  createRoom: { limit: 15, windowMs: 10 * 60_000 },
  joinRoom: { limit: 40, windowMs: 10 * 60_000 },
  lookup: { limit: 120, windowMs: 10 * 60_000 },
  actions: { limit: 600, windowMs: 60_000 },
} as const;
