"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Download, Home, LogOut, Play, Plus, Share2, Users } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { BuiltBy } from "@/components/home/developer-story";
import { Button } from "@/components/ui/button";
import type { LeaderboardRow, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { BottomBar } from "./bottom-bar";
import { celebrate } from "./confetti";
import { copyText } from "./game-header";
import type { Act } from "./game-room";
import { Leaderboard } from "./leaderboard";

export function FinalResults({ view, act, onLeave }: { view: RoomView; act: Act; onLeave: () => void }) {
  const final = view.final;
  const rows = view.leaderboard;
  const winners = rows.filter((r) => final?.winnerIds.includes(r.playerId));
  const host = view.players.find((p) => p.isHost);

  useEffect(() => {
    void celebrate("big");
  }, []);

  const headline =
    winners.length === 0
      ? "Nobody cracked the crowd!"
      : winners.length === 1
        ? `${winners[0]!.nickname} wins!`
        : `${winners.map((w) => w.nickname).join(" & ")} tie for the win!`;

  const rivalA = rows.find((r) => r.playerId === final?.rivals?.aId);
  const rivalB = rows.find((r) => r.playerId === final?.rivals?.bId);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-3 pt-2 text-center">
        <motion.span
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
          className="text-7xl"
          aria-hidden
        >
          🏆
        </motion.span>
        <p className="font-bold tracking-wide text-ink-soft uppercase">Game over · {final?.roomName}</p>
        <h1 className="font-display text-4xl leading-tight font-extrabold text-balance sm:text-5xl">{headline}</h1>
        {winners.length > 0 && (
          <p className="text-lg font-semibold text-ink-soft">
            {view.room.settings.mode === "minority" ? "Spotted the most underdogs" : "Read the room best"} with{" "}
            {winners[0]!.score}{" "}
            {winners[0]!.score === 1 ? "point" : "points"} and {winners[0]!.accuracy}% accuracy.
          </p>
        )}
      </section>

      <Podium rows={rows} />

      {rivalA && rivalB && rows.length > 2 && (
        <section className="flex items-center gap-4 rounded-3xl bg-berry-soft p-4 pop">
          <span className="flex -space-x-3">
            <Avatar avatar={rivalA.avatar} size="md" />
            <Avatar avatar={rivalB.avatar} size="md" />
          </span>
          <p className="font-semibold">
            <b className="font-display text-lg">Closest rivals:</b> {rivalA.nickname} and {rivalB.nickname}{" "}
            {final!.rivals!.gap === 0
              ? "finished dead level."
              : `were split by just ${final!.rivals!.gap} ${final!.rivals!.gap === 1 ? "point" : "points"}.`}
          </p>
        </section>
      )}

      <section aria-labelledby="final-board" className="flex flex-col gap-3">
        <h2 id="final-board" className="font-display text-2xl font-extrabold">
          Final leaderboard
        </h2>
        <Leaderboard rows={rows} meId={view.me.id} showChange={false} />
      </section>

      <ShareCard view={view} rows={rows} winners={winners} />

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5 pop">
        <h2 className="font-display text-2xl font-extrabold">What next?</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline">
            <Link href="/create">
              <Plus /> New room
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home /> Home
            </Link>
          </Button>
          <Button variant="outline" onClick={onLeave}>
            <LogOut /> Leave room
          </Button>
        </div>
      </section>

      <BuiltBy className="opacity-80" />

      <BottomBar>
        {view.me.isHost ? (
          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={() => void act({ type: "rematch", mode: "play" })}>
              <Play /> Play again
            </Button>
            <Button size="lg" variant="outline" onClick={() => void act({ type: "rematch", mode: "lobby" })}>
              <Users /> <span className="hidden sm:inline">Back to</span> lobby
            </Button>
          </div>
        ) : (
          <p className="py-3 text-center font-display text-lg font-bold">
            Waiting for {host?.nickname ?? "the host"} to start a rematch…
          </p>
        )}
        <p className="pb-1 text-center text-xs font-semibold text-muted-foreground">
          Rematches keep everyone in the room and reset the scores.
        </p>
      </BottomBar>
    </div>
  );
}

function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top = rows.slice(0, 3);
  // Visual order: 2nd, 1st, 3rd.
  const order = [top[1], top[0], top[2]].filter(Boolean) as LeaderboardRow[];
  const heights: Record<number, string> = { 1: "h-32", 2: "h-24", 3: "h-16" };
  const colors: Record<number, string> = { 1: "bg-sun", 2: "bg-sky", 3: "bg-berry" };
  return (
    <section aria-label="Podium" className="flex items-end justify-center gap-3 pt-4">
      {order.map((r, i) => (
        <motion.div
          key={r.playerId}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 + i * 0.15, type: "spring", stiffness: 200, damping: 18 }}
          className="flex w-24 flex-col items-center gap-2 sm:w-32"
        >
          <Avatar avatar={r.avatar} size={r.rank === 1 ? "xl" : "lg"} />
          <span className="w-full truncate text-center font-display font-extrabold">{r.nickname}</span>
          <div
            className={cn(
              "flex w-full flex-col items-center justify-start rounded-t-2xl border-[3px] border-b-0 border-ink pt-2",
              heights[Math.min(r.rank, 3)],
              colors[Math.min(r.rank, 3)],
            )}
          >
            <span className="font-display text-3xl font-extrabold">{r.rank}</span>
            <span className="text-sm font-bold">{r.score} pts</span>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

function ShareCard({ view, rows, winners }: { view: RoomView; rows: LeaderboardRow[]; winners: LeaderboardRow[] }) {
  const final = view.final!;
  const text = [
    `🏆 Crowdwink: ${final.roomName}`,
    winners.length ? `Winner: ${winners.map((w) => w.nickname).join(" & ")}` : "No winner this time!",
    ...rows.map((r) => `${r.rank}. ${r.nickname}: ${r.score} pts (${r.accuracy}% accuracy)`),
    `${final.roundsPlayed} rounds · Know your people. Beat the crowd.`,
  ].join("\n");
  const imageUrl = `/api/rooms/${view.room.code}/card?game=${view.room.gameNumber}`;

  return (
    <section aria-labelledby="share-title" className="flex flex-col gap-3">
      <h2 id="share-title" className="font-display text-2xl font-extrabold">
        Share the bragging rights
      </h2>
      <div className="rounded-3xl bg-grape p-5 text-white pop-lg">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <LogoMark className="size-8" />
            <span className="font-display text-xl font-extrabold">crowdwink</span>
          </span>
          <span className="text-sm font-bold text-white/80">{final.roundsPlayed} rounds</span>
        </div>
        <p className="mt-4 text-sm font-bold tracking-wide text-white/75 uppercase">{final.roomName}</p>
        <p className="font-display text-3xl leading-tight font-extrabold">
          {winners.length ? `🏆 ${winners.map((w) => w.nickname).join(" & ")}` : "No winner this time"}
        </p>
        <ol className="mt-4 flex flex-col gap-1.5">
          {rows.map((r) => (
            <li key={r.playerId} className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-1.5">
              <span className="w-5 font-display font-extrabold">{r.rank}</span>
              <Avatar avatar={r.avatar} size="xs" />
              <span className="flex-1 truncate font-bold">{r.nickname}</span>
              <span className="text-sm font-semibold text-white/80">{r.accuracy}%</span>
              <span className="w-12 text-right font-display font-extrabold">{r.score} pts</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="sun"
          onClick={async () => {
            if (typeof navigator.share === "function") {
              try {
                await navigator.share({ title: "Crowdwink results", text });
                return;
              } catch {
                /* cancelled or unsupported: fall back to copy */
              }
            }
            if (await copyText(text)) toast.success("Results copied! Paste them anywhere.");
          }}
        >
          <Share2 /> Share results
        </Button>
        <Button asChild variant="outline">
          <a href={imageUrl} download={`crowdwink-${view.room.code}.png`}>
            <Download /> Save as image
          </a>
        </Button>
      </div>
    </section>
  );
}
