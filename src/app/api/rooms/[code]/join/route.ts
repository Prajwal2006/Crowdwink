import { joinRoom } from "@/lib/server/engine";
import { errorResponse, json, readJson, roomCodeParam } from "@/lib/server/http";
import { enforce, LIMITS } from "@/lib/server/rate-limit";
import { joinRoomSchema } from "@/lib/server/validation";

export async function POST(req: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    await enforce("join", req, LIMITS.joinRoom.limit, LIMITS.joinRoom.windowMs);
    const code = roomCodeParam((await ctx.params).code);
    const { nickname } = joinRoomSchema.parse(await readJson(req));
    return json(await joinRoom(code, nickname), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
