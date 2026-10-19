/**
 * In-process pub/sub used when no Pusher credentials are configured.
 * Works only when a single Node.js process serves all requests (next dev / next start).
 */
type Listener = { playerId: string; send: (event: string, data: unknown) => void };

type Bus = { rooms: Map<string, Set<Listener>> };

const g = globalThis as unknown as { __crowdwinkBus?: Bus };
const bus: Bus = (g.__crowdwinkBus ??= { rooms: new Map() });

function presence(code: string): string[] {
  const set = bus.rooms.get(code);
  if (!set) return [];
  return [...new Set([...set].map((l) => l.playerId))];
}

function broadcastPresence(code: string) {
  const ids = presence(code);
  for (const l of bus.rooms.get(code) ?? []) l.send("presence", { ids });
}

export function subscribe(code: string, listener: Listener): () => void {
  let set = bus.rooms.get(code);
  if (!set) bus.rooms.set(code, (set = new Set()));
  set.add(listener);
  broadcastPresence(code);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) bus.rooms.delete(code);
    else broadcastPresence(code);
  };
}

export function publishLocal(code: string, event: string, data: unknown) {
  for (const l of bus.rooms.get(code) ?? []) l.send(event, data);
}
