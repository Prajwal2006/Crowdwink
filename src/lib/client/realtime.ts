"use client";

import { api, ApiError } from "./api";
import { credential, type Identity } from "./identity";

export type ConnectionState = "connecting" | "live" | "offline";

export type RealtimeHandlers = {
  onSync: (version: number) => void;
  onPresence: (playerIds: string[]) => void;
  onState: (state: ConnectionState) => void;
};

/**
 * - pusher: Pusher Channels (or a Pusher-compatible server). Best on any host.
 * - sse:    in-process Server-Sent Events. Only works when ONE Node process serves everything.
 * - poll:   short polling of a version number. Works anywhere, including serverless.
 * Resolved at build time in next.config.ts (`NEXT_PUBLIC_REALTIME`).
 */
export type RealtimeProvider = "pusher" | "sse" | "poll";

export const realtimeProvider: RealtimeProvider = (() => {
  const configured = process.env.NEXT_PUBLIC_REALTIME;
  if (configured === "pusher" || configured === "sse" || configured === "poll") return configured;
  return process.env.NEXT_PUBLIC_PUSHER_KEY ? "pusher" : "sse";
})();

/**
 * Subscribes to a room's live channel. Messages only carry a version number; the
 * client then fetches its own authorized state. Returns an unsubscribe function.
 */
export function connectRealtime(identity: Identity, handlers: RealtimeHandlers): () => void {
  if (realtimeProvider === "pusher") return connectPusher(identity, handlers);
  if (realtimeProvider === "poll") return connectPoll(identity, handlers);
  return connectSse(identity, handlers);
}

const POLL_MS = 1_500;
const POLL_HIDDEN_MS = 10_000;

function connectPoll(identity: Identity, h: RealtimeHandlers) {
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let state: ConnectionState | null = null;

  const setState = (next: ConnectionState) => {
    if (next === state) return;
    state = next;
    h.onState(next);
  };

  const tick = async () => {
    if (closed) return;
    try {
      const { v } = await api<{ v: number }>(`/api/rooms/${identity.code}/version`, { identity });
      if (closed) return;
      setState("live");
      h.onSync(v);
    } catch (err) {
      if (closed) return;
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        // Kicked, expired or signed out: let a full refresh surface the error, then stop.
        h.onSync(Number.POSITIVE_INFINITY);
        return;
      }
      setState("connecting");
    }
    const delay = document.visibilityState === "visible" ? POLL_MS : POLL_HIDDEN_MS;
    timer = setTimeout(tick, delay);
  };

  setState("connecting");
  void tick();

  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
  };
}

function connectSse(identity: Identity, h: RealtimeHandlers) {
  let closed = false;
  let source: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    if (closed) return;
    h.onState("connecting");
    const url = `/api/rooms/${identity.code}/stream?auth=${encodeURIComponent(credential(identity))}`;
    source = new EventSource(url);
    source.onopen = () => h.onState("live");
    source.addEventListener("sync", (e) => {
      const { v } = JSON.parse((e as MessageEvent).data) as { v: number };
      h.onSync(v);
    });
    source.addEventListener("presence", (e) => {
      const { ids } = JSON.parse((e as MessageEvent).data) as { ids: string[] };
      h.onPresence(ids);
    });
    source.onerror = () => {
      h.onState("connecting");
      // EventSource retries on its own unless the server refused us outright.
      if (source?.readyState === EventSource.CLOSED) {
        source = null;
        retry = setTimeout(open, 3_000);
      }
    };
  };
  open();

  return () => {
    closed = true;
    if (retry) clearTimeout(retry);
    source?.close();
  };
}

function connectPusher(identity: Identity, h: RealtimeHandlers) {
  let cleanup: (() => void) | null = null;
  let cancelled = false;

  void import("pusher-js").then(({ default: Pusher }) => {
    if (cancelled) return;
    const host = process.env.NEXT_PUBLIC_PUSHER_HOST;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
      ...(host
        ? {
            wsHost: host,
            wsPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT || 6001),
            wssPort: Number(process.env.NEXT_PUBLIC_PUSHER_PORT || 6001),
            forceTLS: process.env.NEXT_PUBLIC_PUSHER_USE_TLS !== "false",
            enabledTransports: ["ws", "wss"],
          }
        : {}),
      channelAuthorization: {
        endpoint: "/api/realtime/auth",
        transport: "ajax",
        headers: { Authorization: `Bearer ${credential(identity)}` },
      },
    });

    pusher.connection.bind("state_change", ({ current }: { current: string }) => {
      h.onState(current === "connected" ? "live" : current === "connecting" ? "connecting" : "offline");
    });

    const channel = pusher.subscribe(`presence-room-${identity.code}`);
    const members = new Set<string>();
    const emit = () => h.onPresence([...members]);
    channel.bind("pusher:subscription_succeeded", (data: { each: (fn: (m: { id: string }) => void) => void }) => {
      members.clear();
      data.each((m) => members.add(m.id));
      emit();
    });
    channel.bind("pusher:member_added", (m: { id: string }) => {
      members.add(m.id);
      emit();
    });
    channel.bind("pusher:member_removed", (m: { id: string }) => {
      members.delete(m.id);
      emit();
    });
    channel.bind("sync", (data: { v: number }) => h.onSync(data.v));

    cleanup = () => {
      channel.unbind_all();
      pusher.unsubscribe(channel.name);
      pusher.disconnect();
    };
  });

  return () => {
    cancelled = true;
    cleanup?.();
  };
}
