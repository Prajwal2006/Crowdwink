import { parseCredential } from "@/lib/server/auth";
import { errorResponse, roomCodeParam } from "@/lib/server/http";
import { subscribe } from "@/lib/server/local-bus";
import { pusherConfigured } from "@/lib/server/realtime";
import { verifyMembership } from "@/lib/server/view";

/**
 * Server-Sent Events fallback used when Pusher isn't configured.
 * Only reliable when a single Node.js process serves all requests.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[code]/stream">) {
  try {
    if (pusherConfigured()) {
      return Response.json({ error: { code: "use_pusher", message: "Realtime runs on Pusher." } }, { status: 404 });
    }
    const code = roomCodeParam((await ctx.params).code);
    const auth = parseCredential(new URL(req.url).searchParams.get("auth"));
    if (!auth) {
      return Response.json({ error: { code: "not_in_room", message: "Not in room." } }, { status: 401 });
    }
    const { playerId } = await verifyMembership(code, auth);

    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            cleanup();
          }
        };
        controller.enqueue(encoder.encode(`retry: 2000\n\n`));
        const unsubscribe = subscribe(code, { playerId, send });
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            cleanup();
          }
        }, 15_000);
        cleanup = () => {
          clearInterval(keepAlive);
          unsubscribe();
          cleanup = () => {};
        };
        req.signal.addEventListener("abort", () => {
          cleanup();
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
