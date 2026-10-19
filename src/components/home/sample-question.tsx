"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { RotateCcw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Step = "vote" | "predict" | "reveal";
const CROWD = { a: 5, b: 3 };

export function SampleQuestion() {
  const [step, setStep] = useState<Step>("vote");
  const [vote, setVote] = useState<"a" | "b" | null>(null);
  const [prediction, setPrediction] = useState<"a" | "b" | null>(null);
  const reduce = useReducedMotion();

  const total = CROWD.a + CROWD.b;
  const pct = { a: Math.round((CROWD.a / total) * 100), b: Math.round((CROWD.b / total) * 100) };
  const correct = prediction === "a";

  const options = [
    { key: "a" as const, label: "Fly", emoji: "🕊️", bg: "bg-berry", soft: "bg-berry-soft" },
    { key: "b" as const, label: "Turn invisible", emoji: "🫥", bg: "bg-sky", soft: "bg-sky-soft" },
  ];

  return (
    <div className="relative rounded-3xl bg-card p-5 pop-lg sm:p-6" aria-label="Sample round">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Badge variant="sun">⚡ Superpowers</Badge>
        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Try a sample round</span>
      </div>
      <h3 className="font-display text-2xl leading-tight font-extrabold sm:text-[1.7rem]">
        Would you rather be able to fly or become invisible?
      </h3>
      <p className="mt-2 text-sm font-semibold text-ink-soft" aria-live="polite">
        {step === "vote" && "Step 1 · Pick your answer."}
        {step === "predict" && "Step 2 · Which will most of the crowd pick?"}
        {step === "reveal" && (correct ? "You read the crowd! +1 point 🎉" : "Not this time. The crowd went the other way.")}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {options.map((o) => {
          const isVote = vote === o.key;
          const isPred = prediction === o.key;
          const winner = step === "reveal" && o.key === "a";
          return (
            <button
              key={o.key}
              type="button"
              disabled={step === "reveal"}
              onClick={() => {
                if (step === "vote") {
                  setVote(o.key);
                  setStep("predict");
                } else if (step === "predict") {
                  setPrediction(o.key);
                  setStep("reveal");
                }
              }}
              className={cn(
                "relative flex min-h-32 flex-col items-start justify-between overflow-hidden rounded-2xl p-3 text-left pop pressable disabled:cursor-default",
                step === "reveal" ? o.soft : o.bg,
                winner && "ring-4 ring-sun ring-offset-2 ring-offset-card",
              )}
              aria-label={o.label}
            >
              {step === "reveal" && (
                <motion.span
                  className={cn("absolute inset-y-0 left-0", o.bg)}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct[o.key]}%` }}
                  transition={{ duration: reduce ? 0 : 0.9, ease: "easeOut" }}
                  aria-hidden
                />
              )}
              <span className="relative text-3xl">{o.emoji}</span>
              <span className="relative font-display text-lg leading-tight font-extrabold">{o.label}</span>
              <span className="relative flex flex-wrap gap-1 text-[11px] font-bold">
                {isVote && <span className="rounded-full bg-card/90 px-2 py-0.5">your pick</span>}
                {isPred && <span className="rounded-full bg-ink px-2 py-0.5 text-white">your prediction</span>}
                {step === "reveal" && <span className="rounded-full bg-card/90 px-2 py-0.5">{pct[o.key]}%</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm font-semibold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" /> 8 friends answered
        </span>
        {step !== "vote" && (
          <button
            type="button"
            onClick={() => {
              setStep("vote");
              setVote(null);
              setPrediction(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-grape hover:bg-grape/10"
          >
            <RotateCcw className="size-4" /> Again
          </button>
        )}
      </div>
    </div>
  );
}
