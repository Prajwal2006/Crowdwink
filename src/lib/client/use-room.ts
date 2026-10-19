"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HEARTBEAT_MS, PRESENCE_WINDOW_MS } from "@/lib/game/constants";
import type { GameAction, RoomView } from "@/lib/types";
import { api, ApiError } from "./api";
import type { Identity } from "./identity";
import { connectRealtime, type ConnectionState } from "./realtime";

export type RoomHandle = {
  view: RoomView | null;
  error: ApiError | null;
  connection: ConnectionState;
  /** Milliseconds to add to Date.now() to get server time. */
  clockOffset: number;
  isOnline: (playerId: string) => boolean;
  act: (action: GameAction) => Promise<RoomView | null>;
  refresh: () => Promise<void>;
};

/**
 * Keeps one player's view of a room in sync.
 * - Realtime "sync" pushes trigger a fetch of the authoritative state.
 * - A heartbeat every 20s tells the server we're still here (for host hand-off and
 *   stalled-round handling) and reports the latest version, so a missed push is
 *   recovered within one heartbeat.
 * - The tab also refreshes when it becomes visible again or the network returns.
 */
export function useRoom(identity: Identity): RoomHandle {
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [presence, setPresence] = useState<Set<string> | null>(null);
  const [clockOffset, setClockOffset] = useState(0);

  const versionRef = useRef(0);
  const inFlight = useRef(false);
  const pending = useRef(false);
  const code = identity.code;

  const apply = useCallback((next: RoomView) => {
    if (next.version < versionRef.current) return;
    versionRef.current = next.version;
    setClockOffset(next.serverNow - Date.now());
    setView(next);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    try {
      do {
        pending.current = false;
        const next = await api<RoomView>(`/api/rooms/${code}/state`, { identity });
        apply(next);
      } while (pending.current);
    } catch (err) {
      if (err instanceof ApiError) setError(err);
    } finally {
      inFlight.current = false;
    }
  }, [apply, code, identity]);

  const act = useCallback(
    async (action: GameAction) => {
      const res = await api<RoomView | { version: number } | { left: true }>(`/api/rooms/${code}/action`, {
        identity,
        body: action,
      });
      if ("room" in res) {
        apply(res);
        return res;
      }
      return null;
    },
    [apply, code, identity],
  );

  // Initial load + realtime subscription.
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const disconnect = connectRealtime(identity, {
      onSync: (v) => {
        if (v > versionRef.current) void refresh();
      },
      onPresence: (ids) => setPresence(new Set(ids)),
      onState: (state) => {
        setConnection(state);
        // Catch up on anything missed while the socket was down.
        if (state === "live") void refresh();
      },
    });
    return () => {
      clearTimeout(initial);
      disconnect();
    };
  }, [identity, refresh]);

  // Heartbeat.
  useEffect(() => {
    const beat = async () => {
      try {
        const res = await api<RoomView | { version: number }>(`/api/rooms/${code}/action`, {
          identity,
          body: { type: "heartbeat" },
        });
        if ("room" in res) apply(res);
        else if (res.version > versionRef.current) void refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status !== 0) setError(err);
      }
    };
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [apply, code, identity, refresh]);

  // Refresh when coming back to the tab or back online.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => void refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [refresh]);

  // When the answer timer runs out, ask the server to close the round.
  const deadline = view?.round?.phase === "answering" ? view.round.deadlineAt : null;
  useEffect(() => {
    if (!deadline) return;
    const wait = deadline - (Date.now() + clockOffset) + 400;
    const id = setTimeout(() => void refresh(), Math.max(wait, 0));
    return () => clearTimeout(id);
  }, [deadline, clockOffset, refresh]);

  const isOnline = useCallback(
    (playerId: string) => {
      if (view?.me.id === playerId) return true;
      if (presence?.has(playerId)) return true;
      const p = view?.players.find((x) => x.id === playerId);
      if (!p || !view) return false;
      return view.serverNow - p.lastSeenAt < PRESENCE_WINDOW_MS && !presence;
    },
    [presence, view],
  );

  return { view, error, connection, clockOffset, isOnline, act, refresh };
}

/** Server-synchronized clock that ticks while `active`. */
export function useServerNow(offset: number, active = true, intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now() + offset), intervalMs);
    return () => clearInterval(id);
  }, [offset, active, intervalMs]);
  return now;
}
