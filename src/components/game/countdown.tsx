"use client";

import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { getCategory } from "@/data/questions";
import type { RoomView, RoundView } from "@/lib/types";

export function Countdown({ view, round, now }: { view: RoomView; round: RoundView; now: number }) {
  const secs = Math.max(1, Math.ceil((round.startsAt - now) / 1000));
  const category = getCategory(round.question.category);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
      <p className="font-display text-2xl font-extrabold text-ink-soft">
        Round {round.number} of {view.room.settings.rounds}
      </p>
      {category && (
        <Badge variant="sky" className="px-4 py-1.5 text-base">
          <span aria-hidden>{category.emoji}</span> {category.label}
        </Badge>
      )}
      <div className="relative flex size-44 items-center justify-center rounded-full bg-sun pop-lg" aria-live="assertive">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={secs}
            initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="font-display text-8xl font-extrabold"
          >
            {secs}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="font-semibold text-ink-soft">Get ready to read the room…</p>
    </div>
  );
}
