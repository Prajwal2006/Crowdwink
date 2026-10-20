import { requireAuth } from "@/lib/server/auth";
import { errorResponse, json, roomCodeParam } from "@/lib/server/http";
import { verifyMembership } from "@/lib/server/view";

/**
 * Cheap version check for the polling transport (serverless hosts without Pusher).
 * Clients fetch the full state only when this number moves.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]/version">) {
  try {
    const auth = requireAuth(req);
    const code = roomCodeParam((await ctx.params).code);
    const { version } = await verifyMembership(code, auth);
    return json({ v: version });
  } catch (err) {
    return errorResponse(err);
  }
}
