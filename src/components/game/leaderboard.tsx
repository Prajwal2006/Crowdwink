"use client";

import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { LeaderboardRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  rows,
  meId,
  showChange = true,
}: {
  rows: LeaderboardRow[];
  meId: string;
  showChange?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card pop">
      <div className="grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 border-b-2 border-ink/10 px-4 py-2 text-xs font-bold tracking-wide text-ink-soft uppercase sm:grid-cols-[2.5rem_1fr_6rem_5rem_4rem]">
        <span>#</span>
        <span>Player</span>
        <span className="hidden text-right sm:block">Correct</span>
        <span className="text-right">Accuracy</span>
        <span className="text-right">Pts</span>
      </div>
      <ol>
        {rows.map((r, i) => (
          <motion.li
            key={r.playerId}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
            className={cn(
              "grid grid-cols-[2.5rem_1fr_auto_auto] items-center gap-3 border-b-2 border-ink/5 px-4 py-3 last:border-b-0 sm:grid-cols-[2.5rem_1fr_6rem_5rem_4rem]",
              r.playerId === meId && "bg-sun-soft",
            )}
          >
            <span className="font-display text-xl font-extrabold" aria-label={`Rank ${r.rank}`}>
              {r.rank <= 3 && r.score > 0 ? MEDALS[r.rank - 1] : r.rank}
            </span>
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar avatar={r.avatar} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-display text-lg leading-tight font-extrabold">
                  {r.nickname}
                  {r.playerId === meId && <span className="text-ink-soft"> (you)</span>}
                </span>
                {showChange && <RankChange row={r} />}
              </span>
            </span>
            <span className="hidden text-right font-semibold sm:block">
              {r.correct}/{r.predicted}
            </span>
            <span className="text-right font-semibold">{r.predicted ? `${r.accuracy}%` : "–"}</span>
            <span className="text-right font-display text-2xl font-extrabold">{r.score}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function RankChange({ row }: { row: LeaderboardRow }) {
  if (row.prevRank === null) return null;
  const delta = row.prevRank - row.rank;
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700">
        <ArrowUp className="size-3.5" strokeWidth={3} /> up {delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-700">
        <ArrowDown className="size-3.5" strokeWidth={3} /> down {-delta}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-soft">
      <Minus className="size-3.5" strokeWidth={3} /> same
    </span>
  );
}
