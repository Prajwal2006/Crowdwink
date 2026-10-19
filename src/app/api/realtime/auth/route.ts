import { requireAuth } from "@/lib/server/auth";
import { Errors } from "@/lib/server/errors";
import { errorResponse, json } from "@/lib/server/http";
import { getPusher } from "@/lib/server/realtime";
import { verifyMembership } from "@/lib/server/view";
import { isValidRoomCode } from "@/lib/game/codes";

/**
 * Pusher presence-channel authorization. A player may only subscribe to the
 * channel of the room they belong to, and their presence id is their player id.
 */
export async function POST(req: Request) {
  try {
    const pusher = getPusher();
    if (!pusher) throw Errors.badRequest("Pusher is not configured.");
    const auth = requireAuth(req);
    const form = new URLSearchParams(await req.text());
    const socketId = form.get("socket_id") ?? "";
    const channel = form.get("channel_name") ?? "";
    const match = /^presence-room-([A-Z0-9]+)$/.exec(channel);
    if (!match || !isValidRoomCode(match[1]!) || !/^\d+\.\d+$/.test(socketId)) {
      throw Errors.badRequest("Invalid channel.");
    }
    const member = await verifyMembership(match[1]!, auth);
    const body = pusher.authorizeChannel(socketId, channel, {
      user_id: member.playerId,
      user_info: { nickname: member.nickname },
    });
    return json(body);
  } catch (err) {
    return errorResponse(err);
  }
}
