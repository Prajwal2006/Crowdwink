import { lt, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { rateLimits, rooms } from "@/db/schema";
import { ROOM_TTL_MS } from "@/lib/game/constants";

/**
 * Room expiry strategy:
 * - A room is "expired" once it has had no activity for ROOM_TTL_MS (24h). Expired
 *   rooms reject every request immediately (see isExpired in engine.ts).
 * - This cleanup deletes expired rooms. Players, rounds, votes, predictions, results
 *   and game summaries go with them through ON DELETE CASCADE.
 * - It also clears stale rate-limit counters.
 * Run it from the cron route (/api/cron/cleanup) or `npm run db:cleanup`.
 */
export async function cleanupExpired(db: DB) {
  const cutoff = new Date(Date.now() - ROOM_TTL_MS);
  const deletedRooms = await db
    .delete(rooms)
    .where(lt(rooms.lastActivityAt, cutoff))
    .returning({ id: rooms.id });
  const deletedLimits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.resetAt, sql`now()`))
    .returning({ key: rateLimits.key });
  return { rooms: deletedRooms.length, rateLimits: deletedLimits.length };
}
