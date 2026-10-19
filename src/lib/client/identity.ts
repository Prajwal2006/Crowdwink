"use client";

export type Identity = {
  code: string;
  playerId: string;
  token: string;
  nickname: string;
};

/**
 * Where a player's secret lives:
 * - sessionStorage (per tab): the identity this tab is playing as. Survives refresh,
 *   and lets two tabs in one browser be two different players (handy for testing).
 * - localStorage (per browser): remembers the last identity per room so a closed tab
 *   can rejoin with one tap ("Continue as Sam").
 */
const sessionKey = (code: string) => `crowdwink:session:${code}`;
const SAVED_KEY = "crowdwink:identities";

function read<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | undefined, key: string, value: unknown) {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable (private mode); the game still works for this tab */
  }
}

const session = () => (typeof window === "undefined" ? undefined : window.sessionStorage);
const local = () => (typeof window === "undefined" ? undefined : window.localStorage);

function isIdentity(v: unknown): v is Identity {
  const i = v as Identity;
  return !!i && typeof i.playerId === "string" && typeof i.token === "string" && typeof i.code === "string";
}

export function getTabIdentity(code: string): Identity | null {
  const v = read<Identity>(session(), sessionKey(code));
  return isIdentity(v) ? v : null;
}

export function getSavedIdentity(code: string): Identity | null {
  const all = read<Record<string, Identity>>(local(), SAVED_KEY) ?? {};
  const v = all[code];
  return isIdentity(v) ? v : null;
}

export function activateIdentity(identity: Identity) {
  write(session(), sessionKey(identity.code), identity);
}

export function saveIdentity(identity: Identity) {
  activateIdentity(identity);
  const all = read<Record<string, Identity>>(local(), SAVED_KEY) ?? {};
  all[identity.code] = identity;
  // Keep the list short.
  const entries = Object.entries(all).slice(-20);
  write(local(), SAVED_KEY, Object.fromEntries(entries));
}

export function forgetIdentity(code: string, playerId?: string) {
  const tab = getTabIdentity(code);
  if (!playerId || tab?.playerId === playerId) write(session(), sessionKey(code), null);
  const all = read<Record<string, Identity>>(local(), SAVED_KEY) ?? {};
  if (all[code] && (!playerId || all[code]!.playerId === playerId)) {
    delete all[code];
    write(local(), SAVED_KEY, all);
  }
}

export function credential(identity: Pick<Identity, "playerId" | "token">) {
  return `${identity.playerId}.${identity.token}`;
}
