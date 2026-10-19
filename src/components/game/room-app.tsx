"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { forgetIdentity, getTabIdentity, type Identity, saveIdentity } from "@/lib/client/identity";
import { isValidCode } from "@/lib/client/room-code";
import { GameRoom } from "./game-room";
import { JoinGate } from "./join-gate";
import { RoomGone } from "./room-gone";
import { RoomLoading } from "./room-loading";

const subscribeNoop = () => () => {};

export function RoomApp() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // `undefined` = follow storage; `null` = explicitly signed out of this room.
  const [override, setOverride] = useState<Identity | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  const stored = useMemo(() => (hydrated ? getTabIdentity(code) : undefined), [hydrated, code]);
  const identity = override !== undefined ? override : stored;

  const onJoined = useCallback((next: Identity) => {
    saveIdentity(next);
    setNotice(null);
    setOverride(next);
  }, []);

  const onExit = useCallback(
    (message: string | null, playerId?: string) => {
      forgetIdentity(code, playerId);
      setNotice(message);
      setOverride(null);
    },
    [code],
  );

  if (!isValidCode(code)) return <RoomGone kind="not_found" />;
  if (identity === undefined) return <RoomLoading />;
  if (identity === null) return <JoinGate code={code} notice={notice} onJoined={onJoined} />;
  return <GameRoom key={identity.playerId} identity={identity} onExit={onExit} />;
}
