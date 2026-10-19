import { createRoom } from "@/lib/server/engine";
import { errorResponse, json, readJson } from "@/lib/server/http";
import { enforce, LIMITS } from "@/lib/server/rate-limit";
import { createRoomSchema } from "@/lib/server/validation";

/** Create a room. The creator becomes the host and receives their secret player token. */
export async function POST(req: Request) {
  try {
    await enforce("create", req, LIMITS.createRoom.limit, LIMITS.createRoom.windowMs);
    const input = createRoomSchema.parse(await readJson(req));
    const result = await createRoom(input);
    return json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
