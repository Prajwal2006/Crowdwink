"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, LogIn, RefreshCw, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client/api";
import { activateIdentity, getSavedIdentity, type Identity } from "@/lib/client/identity";
import { NICKNAME_MAX } from "@/lib/game/constants";
import type { JoinResponse, RoomPreview } from "@/lib/types";
import { RoomGone } from "./room-gone";
import { RoomLoading } from "./room-loading";

export function JoinGate({
  code,
  notice,
  onJoined,
}: {
  code: string;
  notice: string | null;
  onJoined: (identity: Identity) => void;
}) {
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saved] = useState(() => getSavedIdentity(code));
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api<RoomPreview>(`/api/rooms/${code}`, { signal: ctrl.signal })
      .then((p) => {
        setPreview(p);
        setLoadError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) setLoadError(err);
      });
    return () => ctrl.abort();
  }, [code, attempt]);

  if (loadError?.code === "room_not_found") return <RoomGone kind="not_found" />;
  if (loadError?.code === "room_expired") return <RoomGone kind="expired" />;
  if (loadError) {
    return (
      <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-sm font-semibold text-ink-soft">{loadError.message}</p>
        <Button onClick={() => setAttempt((a) => a + 1)}>
          <RefreshCw /> Try again
        </Button>
      </main>
    );
  }
  if (!preview) return <RoomLoading />;

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Pick a nickname first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<JoinResponse>(`/api/rooms/${code}/join`, { body: { nickname } });
      onJoined({ code, playerId: res.playerId, token: res.token, nickname: res.nickname });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't join. Please try again.");
      setBusy(false);
    }
  }

  const statusLabel =
    preview.status === "lobby" ? "In the lobby" : preview.status === "playing" ? "Game in progress" : "Game just ended";

  return (
    <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <Link href="/" className="self-center" aria-label="Crowdwink home">
        <Wordmark />
      </Link>

      <section className="flex flex-col gap-5 rounded-3xl bg-card p-6 pop-lg">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">You&apos;re invited to</p>
          <h1 className="font-display text-3xl leading-tight font-extrabold break-words">{preview.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="sun" className="font-mono tracking-widest">
              {preview.code}
            </Badge>
            <Badge variant="sky">
              <Users /> {preview.playerCount}/{preview.maxPlayers}
            </Badge>
            <Badge variant={preview.status === "lobby" ? "mint" : "berry"}>{statusLabel}</Badge>
          </div>
          {preview.hostName && <p className="font-medium text-ink-soft">Hosted by {preview.hostName}</p>}
        </div>

        {notice && (
          <p role="status" className="rounded-2xl bg-sun-soft px-4 py-3 font-semibold pop-sm">
            {notice}
          </p>
        )}

        {saved && !notice && (
          <div className="flex flex-col gap-2 rounded-2xl bg-mint-soft p-4 pop-sm">
            <p className="font-semibold">
              Welcome back! Jump back in as <b>{saved.nickname}</b>?
            </p>
            <Button
              variant="mint"
              onClick={() => {
                activateIdentity(saved);
                onJoined(saved);
              }}
            >
              <LogIn /> Continue as {saved.nickname}
            </Button>
          </div>
        )}

        {preview.full ? (
          <p role="alert" className="rounded-2xl bg-berry-soft px-4 py-3 font-semibold pop-sm">
            This room is full ({preview.maxPlayers} players max). Ask the host to make space, or start your own room.
          </p>
        ) : (
          <form onSubmit={join} className="flex flex-col gap-3">
            <Label htmlFor="join-nickname">{saved && !notice ? "Or join as someone new" : "Your nickname"}</Label>
            <Input
              id="join-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={NICKNAME_MAX * 2}
              placeholder="e.g. Priya ✨"
              autoComplete="nickname"
              autoFocus={!saved}
              aria-invalid={!!error}
              className="h-14 text-lg"
            />
            {preview.status !== "lobby" && (
              <p className="text-sm font-semibold text-muted-foreground">
                You&apos;ll join the game in progress, starting with 0 points.
              </p>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <LogIn />} Join room
            </Button>
            {error && (
              <p role="alert" className="font-semibold text-destructive">
                {error}
              </p>
            )}
          </form>
        )}
      </section>
      <p className="text-center text-sm font-semibold text-muted-foreground">
        No account needed. Your seat is saved on this device.
      </p>
    </main>
  );
}
