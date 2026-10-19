"use client";

import { Check } from "lucide-react";
import { CATEGORIES, countByCategory, type CategoryId } from "@/data/questions";
import { ROUND_OPTIONS } from "@/lib/game/constants";
import { cn } from "@/lib/utils";

const counts = countByCategory();

export function RoundsPicker({
  value,
  onChange,
  disabled,
  id = "rounds",
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {ROUND_OPTIONS.map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              "h-11 min-w-14 rounded-xl px-3 font-display text-lg font-extrabold pop-sm pressable",
              active ? "bg-grape text-white" : "bg-card text-ink",
            )}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

/** Empty selection means "all categories". */
export function CategoryPicker({
  value,
  onChange,
  disabled,
}: {
  value: CategoryId[];
  onChange: (next: CategoryId[]) => void;
  disabled?: boolean;
}) {
  const all = value.length === 0;
  const toggle = (id: CategoryId) => {
    const current = all ? [] : value;
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    onChange(next.length === CATEGORIES.length ? [] : next);
  };
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={all}
        disabled={disabled}
        onClick={() => onChange([])}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold pop-sm pressable",
          all ? "bg-sun text-ink" : "bg-card text-ink",
        )}
      >
        {all && <Check className="size-4" />} 🎲 All categories
      </button>
      {CATEGORIES.map((c) => {
        const active = !all && value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(c.id)}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold pop-sm pressable",
              active ? "bg-sky text-ink" : "bg-card text-ink",
            )}
          >
            {active && <Check className="size-4" />}
            <span aria-hidden>{c.emoji}</span> {c.label}
            <span className="text-xs text-ink/50">{counts[c.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function describeCategories(value: CategoryId[]) {
  if (value.length === 0) return "All categories";
  return value.map((id) => CATEGORIES.find((c) => c.id === id)?.label ?? id).join(", ");
}
