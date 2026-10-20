"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Eye, Loader2, Lock, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/data/questions";
import { MODE_INFO, type GameMode } from "@/lib/game/modes";
import type { Choice, RoomView, RoundView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnswerCard, Tag } from "./answer-card";
import { BottomBar } from "./bottom-bar";
import type { Act } from "./game-room";
import { PlayerStatusStrip } from "./player-status";

type Step = "vote" | "predict" | "wait";

export function QuestionStage({
  view,
  round,
  now,
  act,
  isOnline,
}: {
  view: RoomView;
  round: RoundView;
  now: number;
  act: Act;
  isOnline: (id: string) => boolean;
}) {
  const step: Step = !round.myVote ? "vote" : !round.myPrediction ? "predict" : "wait";
  const [selected, setSelected] = useState<Choice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const category = getCategory(round.question.category);

  // Clear the local selection whenever we move to the next step.
  const [lastStep, setLastStep] = useState(step);
  if (lastStep !== step) {
    setLastStep(step);
    setSelected(null);
  }

  async function lockIn() {
    if (!selected || submitting) return;
    setSubmitting(true);
    await act({ type: step === "vote" ? "vote" : "predict", choice: selected });
    setSubmitting(false);
  }

  // Keyboard shortcuts: A/1 and B/2 to pick.
  useEffect(() => {
    if (step === "wait") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "1") setSelected("a");
      else if (k === "b" || k === "2") setSelected("b");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const total = round.deadlineAt - round.startsAt;
  const left = Math.max(0, round.deadlineAt - now);
  const secondsLeft = Math.ceil(left / 1000);
  const done = round.progress.filter((p) => p.voted && p.predicted).length;
  const waitingOn = view.players.filter((p) => {
    const s = round.progress.find((x) => x.playerId === p.id);
    return !(s?.voted && s?.predicted);
  });
  const anyVotes = round.progress.some((p) => p.voted);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="grape">
            Round {round.number}/{view.room.settings.rounds}
          </Badge>
          {category && (
            <Badge variant="sky">
              <span aria-hidden>{category.emoji}</span> {category.label}
            </Badge>
          )}
          {view.room.settings.mode === "minority" && (
            <Badge variant="berry">
              <span aria-hidden>{MODE_INFO.minority.emoji}</span> {MODE_INFO.minority.label} mode
            </Badge>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-sm font-bold",
            secondsLeft <= 10 ? "bg-tomato text-white" : "bg-card",
          )}
          aria-label={`${secondsLeft} seconds left`}
        >
          <Timer className="size-4" /> {secondsLeft}s
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card" aria-hidden>
        <div
          className={cn("h-full transition-[width] duration-300 ease-linear", secondsLeft <= 10 ? "bg-tomato" : "bg-mint")}
          style={{ width: `${(left / total) * 100}%` }}
        />
      </div>

      <h1 className="font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl">
        {round.question.prompt}
      </h1>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="flex flex-col gap-4"
        >
          <StepHeader step={step} mode={view.room.settings.mode} />
          {step === "wait" ? (
            <LockedIn round={round} mode={view.room.settings.mode} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(["a", "b"] as const).map((o) => (
                <AnswerCard
                  key={o}
                  option={o}
                  label={round.question[o]}
                  selected={selected === o}
                  dimmed={selected !== null && selected !== o}
                  disabled={submitting}
                  onSelect={() => setSelected(o)}
                  tag={step === "predict" && round.myVote === o ? <Tag>your pick</Tag> : undefined}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <section aria-label="Who has answered" className="mt-2 flex flex-col gap-3 rounded-3xl bg-card p-4 pop-sm">
        <p className="text-center text-sm font-bold text-ink-soft" aria-live="polite">
          {done === view.players.length
            ? "Everyone's locked in! Revealing…"
            : `${done} of ${view.players.length} locked in${
                step === "wait" && waitingOn.length
                  ? ` · waiting for ${waitingOn
                      .slice(0, 3)
                      .map((p) => (p.id === view.me.id ? "you" : p.nickname))
                      .join(", ")}${waitingOn.length > 3 ? "…" : ""}`
                  : ""
              }`}
        </p>
        <PlayerStatusStrip view={view} round={round} isOnline={isOnline} />
      </section>

      <BottomBar>
        {step !== "wait" ? (
          <Button size="lg" className="w-full" disabled={!selected || submitting} onClick={lockIn}>
            {submitting ? <Loader2 className="animate-spin" /> : <Lock />}
            {step === "vote" ? "Lock in my answer" : "Lock in my prediction"}
          </Button>
        ) : view.me.isHost ? (
          <Button
            size="lg"
            variant="sun"
            className="w-full"
            disabled={!anyVotes}
            onClick={() => void act({ type: "reveal" })}
          >
            <Eye /> Reveal now{waitingOn.length ? ` (${waitingOn.length} still answering)` : ""}
          </Button>
        ) : (
          <p className="py-3 text-center font-display text-lg font-bold">Hang tight. The reveal is coming…</p>
        )}
        {step !== "wait" && view.me.isHost && anyVotes && (
          <button
            type="button"
            onClick={() => void act({ type: "reveal" })}
            className="pb-1 text-center text-sm font-bold text-grape underline-offset-4 hover:underline"
          >
            Host: reveal now without waiting
          </button>
        )}
        {step !== "wait" && !(view.me.isHost && anyVotes) && (
          <p className="pb-1 text-center text-xs font-semibold text-muted-foreground">
            Tip: press A or B, then lock it in. You can&apos;t change it after.
          </p>
        )}
      </BottomBar>
    </div>
  );
}

function StepHeader({ step, mode }: { step: Step; mode: GameMode }) {
  const steps = [
    { id: "vote", label: "Your answer" },
    { id: "predict", label: mode === "minority" ? "Predict the underdog" : "Predict the crowd" },
    { id: "wait", label: "Reveal" },
  ];
  const index = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex items-center gap-2" aria-label="Round steps">
        {steps.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === index ? "step" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border-2 px-3 text-xs font-bold",
              i < index && "border-ink bg-mint",
              i === index && "border-ink bg-ink text-white",
              i > index && "border-ink/20 text-ink/45",
            )}
          >
            <span>{i + 1}</span>
            <span className={cn(i !== index && "hidden sm:inline")}>{s.label}</span>
          </li>
        ))}
      </ol>
      {step === "vote" && (
        <p className="text-lg font-semibold text-ink-soft">What would <b className="text-ink">you</b> pick? Be honest, it&apos;s secret.</p>
      )}
      {step === "predict" && (
        <p className="text-lg font-semibold text-ink-soft">
          Now, which will <b className="text-ink">{MODE_INFO[mode].target}</b> pick? Your vote counts too.
        </p>
      )}
    </div>
  );
}

function LockedIn({ round, mode }: { round: RoundView; mode: GameMode }) {
  const vote = round.myVote!;
  const prediction = round.myPrediction!;
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="flex flex-col items-center gap-3 rounded-3xl bg-mint-soft p-6 text-center pop"
    >
      <span className="text-5xl" aria-hidden>
        🔒
      </span>
      <p className="font-display text-2xl font-extrabold">You&apos;re locked in!</p>
      <div className="flex flex-wrap justify-center gap-2 font-semibold">
        <span className={cn("rounded-full border-2 border-ink px-3 py-1", vote === "a" ? "bg-berry" : "bg-sky")}>
          You picked: {round.question[vote]}
        </span>
        <span className={cn("rounded-full border-2 border-ink px-3 py-1", prediction === "a" ? "bg-berry" : "bg-sky")}>
          {mode === "minority" ? "Fewer will pick" : "Crowd will pick"}: {round.question[prediction]}
        </span>
      </div>
    </motion.div>
  );
}
