import { requireAuth } from "@/lib/server/auth";
import { performAction } from "@/lib/server/engine";
import { errorResponse, json, readJson, roomCodeParam } from "@/lib/server/http";
import { actionSchema } from "@/lib/server/validation";
import { getView } from "@/lib/server/view";

/**
 * Every in-room action goes through here. The server validates membership, host rights
 * and game phase, then returns the caller's fresh view.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/action">) {
  try {
    const auth = requireAuth(req);
    const code = roomCodeParam((await ctx.params).code);
    const action = actionSchema.parse(await readJson(req));
    const result = await performAction(code, auth, action);
    if (action.type === "leave") return json({ left: true });
    if (action.type === "heartbeat" && !result.changed) {
      return json({ version: result.version });
    }
    return json(await getView(code, auth));
  } catch (err) {
    return errorResponse(err);
  }
}
