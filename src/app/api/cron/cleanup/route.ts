import { getDb } from "@/db";
import { cleanupExpired } from "@/lib/server/cleanup";
import { errorResponse, json } from "@/lib/server/http";

/** Deletes expired rooms. Vercel Cron calls this daily (see vercel.json). */
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
      return json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }
    return json({ deleted: await cleanupExpired(getDb()) });
  } catch (err) {
    return errorResponse(err);
  }
}
