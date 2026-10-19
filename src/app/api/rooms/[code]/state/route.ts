import { requireAuth } from "@/lib/server/auth";
import { errorResponse, json, roomCodeParam } from "@/lib/server/http";
import { getView } from "@/lib/server/view";

/** The authoritative game state, tailored to the requesting player. */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]/state">) {
  try {
    const auth = requireAuth(req);
    const code = roomCodeParam((await ctx.params).code);
    return json(await getView(code, auth));
  } catch (err) {
    return errorResponse(err);
  }
}
