import Pusher from "pusher";
import { publishLocal } from "./local-bus";

/**
 * Real-time fan-out. Events only say "room changed, version N"; clients then fetch
 * their own authorized view from the API. Secrets (votes, predictions) never travel
 * over the realtime channel.
 */
export function channelForRoom(code: string) {
  return `presence-room-${code}`;
}

export function pusherConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET && process.env.NEXT_PUBLIC_PUSHER_KEY,
  );
}

const g = globalThis as unknown as { __crowdwinkPusher?: Pusher };

export function getPusher(): Pusher | null {
  if (!pusherConfigured()) return null;
  if (!g.__crowdwinkPusher) {
    const host = process.env.PUSHER_HOST;
    g.__crowdwinkPusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      ...(host
        ? {
            host,
            port: process.env.PUSHER_PORT,
            useTLS: process.env.PUSHER_USE_TLS !== "false",
          }
        : { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2", useTLS: true }),
    });
  }
  return g.__crowdwinkPusher;
}

export async function publishSync(code: string, version: number) {
  const payload = { v: version };
  const pusher = getPusher();
  if (pusher) {
    try {
      await pusher.trigger(channelForRoom(code), "sync", payload);
    } catch (err) {
      // The database already holds the truth; clients recover on their next heartbeat.
      console.error("[realtime] pusher trigger failed", err);
    }
    return;
  }
  publishLocal(code, "sync", payload);
}
