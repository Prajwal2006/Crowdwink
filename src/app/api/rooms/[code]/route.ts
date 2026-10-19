import { errorResponse, json, roomCodeParam } from "@/lib/server/http";
import { enforce, LIMITS } from "@/lib/server/rate-limit";
import { getPreview } from "@/lib/server/view";

/** Public preview for the join screen: room name, host, player count. No answers or scores. */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]">) {
  try {
    await enforce("lookup", req, LIMITS.lookup.limit, LIMITS.lookup.windowMs);
    const code = roomCodeParam((await ctx.params).code);
    return json(await getPreview(code));
  } catch (err) {
    return errorResponse(err);
  }
}
