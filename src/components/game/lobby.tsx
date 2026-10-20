"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Check, Crown, Play, UserMinus, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { questionsIn } from "@/data/questions";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/constants";
import { MODE_INFO } from "@/lib/game/modes";
import type { PlayerView, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { BottomBar } from "./bottom-bar";
import type { Act } from "./game-room";
import { InviteCard } from "./invite-card";
import { CategoryPicker, describeCategories, ModePicker, RoundsPicker } from "./settings-controls";

const LOBBY_LINES = [
  "Warming up the crowd…",
  "Stretching those prediction muscles…",
  "Polishing the trophy…",
  "Hiding the answers under the couch…",
];

export function Lobby({ view, act, isOnline }: { view: RoomView; act: Act; isOnline: (id: string) => boolean }) {
  const { me, players, room } = view;
  const [kickTarget, setKickTarget] = useState<PlayerView | null>(null);
  const [starting, setStarting] = useState(false);
  const self = players.find((p) => p.id === me.id);
  const readyCount = players.filter((p) => p.ready).length;
  const enough = players.length >= MIN_PLAYERS;
  const line = LOBBY_LINES[players.length % LOBBY_LINES.length];
  const settings = room.settings;
  const enoughQuestions = questionsIn(settings.categories).length >= settings.rounds;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-semibold text-ink-soft">{line}</p>
        <h1 className="font-display text-4xl leading-tight font-extrabold break-words sm:text-5xl">{settings.name}</h1>
        {view.room.gameNumber > 1 && <Badge variant="sun" className="mt-2">Rematch #{view.room.gameNumber - 1}</Badge>}
      </div>

      <InviteCard code={room.code} roomName={settings.name} />

      <section aria-labelledby="players-title">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="players-title" className="font-display text-2xl font-extrabold">
            Players <span className="text-ink-soft">{players.length}/{MAX_PLAYERS}</span>
          </h2>
          <span className="text-sm font-bold text-ink-soft">{readyCount} ready</span>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnimatePresence initial={false}>
            {players.map((p) => {
              const online = isOnline(p.id);
              return (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-3xl p-4 text-center pop",
                    p.ready ? "bg-mint-soft" : "bg-card",
                  )}
                >
                  {p.isHost && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="sun">
                        <Crown /> Host
                      </Badge>
                    </span>
                  )}
                  <span className="relative">
                    <Avatar avatar={p.avatar} size="lg" dim={!online} />
                    <span
                      className={cn(
                        "absolute right-0 bottom-0 size-4 rounded-full border-2 border-ink",
                        online ? "bg-mint" : "bg-ink/30",
                      )}
                      title={online ? "Online" : "Away"}
                    />
                  </span>
                  <span className="w-full truncate font-display text-lg font-extrabold">
                    {p.nickname}
                    {p.id === me.id && <span className="text-ink-soft"> (you)</span>}
                  </span>
                  <span className="text-xs font-bold text-ink-soft">
                    {p.ready ? (
                      <span className="inline-flex items-center gap-1 text-ink">
                        <Check className="size-3.5" /> Ready
                      </span>
                    ) : online ? (
                      "Not ready"
                    ) : (
                      "Away"
                    )}
                    <span className="sr-only">{online ? ", online" : ", offline"}</span>
                  </span>
                  {me.isHost && p.id !== me.id && (
                    <button
                      type="button"
                      onClick={() => setKickTarget(p)}
                      className="absolute top-2 right-2 rounded-lg p-1.5 text-ink/50 hover:bg-tomato/15 hover:text-ink"
                      aria-label={`Remove ${p.nickname}`}
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
          {Array.from({ length: Math.max(0, Math.min(MAX_PLAYERS - players.length, players.length < 4 ? 4 - players.length : 1)) }).map(
            (_, i) => (
              <li
                key={`empty-${i}`}
                className="flex min-h-36 flex-col items-center justify-center gap-1 rounded-3xl border-[2.5px] border-dashed border-ink/30 p-4 text-center text-sm font-bold text-ink/45"
              >
                <UserPlus className="size-6" />
                Waiting for a friend
              </li>
            ),
          )}
        </ul>
      </section>

      <section aria-labelledby="settings-title" className="flex flex-col gap-4 rounded-3xl bg-card p-5 pop">
        <div className="flex items-center justify-between gap-2">
          <h2 id="settings-title" className="font-display text-2xl font-extrabold">
            Game settings
          </h2>
          {!me.isHost && <Badge variant="muted">Host picks</Badge>}
        </div>
        {me.isHost ? (
          <>
            <div className="flex flex-col gap-2">
              <span id="lobby-mode-label" className="text-sm font-bold">
                Game mode
              </span>
              <ModePicker
                id="lobby-mode"
                value={settings.mode}
                onChange={(mode) => void act({ type: "settings", settings: { mode } })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span id="lobby-rounds-label" className="text-sm font-bold">
                Rounds
              </span>
              <RoundsPicker
                id="lobby-rounds"
                value={settings.rounds}
                onChange={(rounds) => void act({ type: "settings", settings: { rounds } })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">Categories</span>
              <CategoryPicker
                value={settings.categories}
                onChange={(categories) => void act({ type: "settings", settings: { categories } })}
              />
              {!enoughQuestions && (
                <p className="text-sm font-semibold text-destructive">
                  Not enough questions for {settings.rounds} rounds. Add categories or lower the rounds.
                </p>
              )}
            </div>
          </>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className={cn("rounded-2xl p-3 sm:col-span-2", settings.mode === "minority" ? "bg-berry-soft" : "bg-mint-soft")}>
              <dt className="text-xs font-bold tracking-wide text-ink-soft uppercase">Game mode</dt>
              <dd className="font-display text-2xl font-extrabold">
                <span aria-hidden>{MODE_INFO[settings.mode].emoji}</span> {MODE_INFO[settings.mode].label}
              </dd>
              <dd className="font-semibold text-ink-soft">{MODE_INFO[settings.mode].rule}</dd>
            </div>
            <div className="rounded-2xl bg-sun-soft p-3">
              <dt className="text-xs font-bold tracking-wide text-ink-soft uppercase">Rounds</dt>
              <dd className="font-display text-2xl font-extrabold">{settings.rounds}</dd>
            </div>
            <div className="rounded-2xl bg-sky-soft p-3">
              <dt className="text-xs font-bold tracking-wide text-ink-soft uppercase">Categories</dt>
              <dd className="font-bold">{describeCategories(settings.categories)}</dd>
            </div>
          </dl>
        )}
      </section>

      <BottomBar>
        <div className="flex gap-2">
          <Button
            variant={self?.ready ? "mint" : "outline"}
            size="lg"
            className={me.isHost ? "flex-none" : "flex-1"}
            aria-pressed={!!self?.ready}
            onClick={() => void act({ type: "ready", ready: !self?.ready })}
          >
            <Check /> {self?.ready ? "Ready!" : "I'm ready"}
          </Button>
          {me.isHost && (
            <Button
              size="lg"
              className="flex-1"
              disabled={!enough || starting || !enoughQuestions}
              onClick={async () => {
                setStarting(true);
                await act({ type: "start" });
                setStarting(false);
              }}
            >
              <Play /> Start game
            </Button>
          )}
        </div>
        <p className="pb-1 text-center text-sm font-semibold text-ink-soft" aria-live="polite">
          {!enough
            ? `Waiting for at least ${MIN_PLAYERS} players. Share the code!`
            : me.isHost
              ? `${readyCount} of ${players.length} ready. Start whenever you like.`
              : `${readyCount} of ${players.length} ready. Waiting for the host to start.`}
        </p>
      </BottomBar>

      <Dialog open={!!kickTarget} onOpenChange={(o) => !o && setKickTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {kickTarget?.nickname}?</DialogTitle>
            <DialogDescription>They&apos;ll be taken out of the room. They can rejoin with the code.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (kickTarget) void act({ type: "kick", playerId: kickTarget.id });
                setKickTarget(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
