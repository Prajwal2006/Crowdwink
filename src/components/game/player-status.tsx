"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { RoomView, RoundView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

/** Shows who has answered without revealing what they picked. */
export function PlayerStatusStrip({
  view,
  round,
  isOnline,
}: {
  view: RoomView;
  round: RoundView;
  isOnline: (id: string) => boolean;
}) {
  const progress = new Map(round.progress.map((p) => [p.playerId, p]));
  return (
    <ul className="flex flex-wrap justify-center gap-3" aria-label="Player progress">
      {view.players.map((p) => {
        const state = progress.get(p.id);
        const done = state?.voted && state?.predicted;
        const half = state?.voted && !state?.predicted;
        const online = isOnline(p.id);
        const label = done ? "locked in" : half ? "voted, predicting" : online ? "thinking" : "away";
        return (
          <li key={p.id} className="flex w-16 flex-col items-center gap-1 text-center">
            <span className="relative">
              <Avatar avatar={p.avatar} size="md" dim={!online && !done} className={cn(!done && "animate-pulse [animation-duration:2.4s]")} />
              {(done || half) && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-ink",
                    done ? "bg-mint" : "bg-sun",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={4} /> : <span className="text-[10px] font-black">½</span>}
                </motion.span>
              )}
            </span>
            <span className="w-full truncate text-xs font-bold">{p.id === view.me.id ? "You" : p.nickname}</span>
            <span className="sr-only">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
