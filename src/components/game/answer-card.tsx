"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { Choice } from "@/lib/types";
import { cn } from "@/lib/utils";

export const OPTION_STYLE = {
  a: { bg: "bg-berry", soft: "bg-berry-soft", letter: "A" },
  b: { bg: "bg-sky", soft: "bg-sky-soft", letter: "B" },
} as const;

export function AnswerCard({
  option,
  label,
  selected,
  dimmed,
  disabled,
  tag,
  onSelect,
}: {
  option: Choice;
  label: string;
  selected?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  tag?: React.ReactNode;
  onSelect?: () => void;
}) {
  const s = OPTION_STYLE[option];
  return (
    <motion.button
      type="button"
      layout
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative grid min-h-24 w-full grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-3xl p-4 text-left pop pressable sm:min-h-48 sm:grid-cols-1 sm:content-between sm:items-start sm:p-5",
        s.bg,
        selected && "ring-4 ring-ink ring-offset-4 ring-offset-paper",
        dimmed && "opacity-50 saturate-50",
        disabled && "cursor-default",
      )}
    >
      <span className="flex items-center justify-between gap-2 sm:w-full">
        <span className="flex size-10 items-center justify-center rounded-xl border-[2.5px] border-ink bg-card font-display text-xl font-extrabold">
          {s.letter}
        </span>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full border-[2.5px] border-ink bg-ink text-white sm:static sm:size-10"
          >
            <Check className="size-6" />
          </motion.span>
        )}
      </span>
      <span className="pr-10 font-display text-2xl leading-tight font-extrabold text-balance sm:pr-0 sm:text-3xl">
        {label}
      </span>
      {tag && <span className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-1">{tag}</span>}
    </motion.button>
  );
}

export function Tag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold",
        dark ? "bg-ink text-white" : "bg-card text-ink",
      )}
    >
      {children}
    </span>
  );
}
