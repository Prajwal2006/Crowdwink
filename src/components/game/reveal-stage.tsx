"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Crown, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/game/modes";
import { percent } from "@/lib/game/scoring";
import type { Choice, RoomView, RoundView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OPTION_STYLE } from "./answer-card";
import { Avatar } from "./avatar";
import { BottomBar } from "./bottom-bar";
import { celebrate } from "./confetti";
import type { Act } from "./game-room";
import { Leaderboard } from "./leaderboard";

type Tab = "results" | "leaderboard";

export function RevealStage({ view, round, act }: { view: RoomView; round: RoundView; act: Act }) {
  const [tab, setTab] = useState<Tab>("results");
  const touched = useRef(false);
  const reduce = useReducedMotion();
  const results = round.results;
  const mine = results?.entries.find((e) => e.playerId === view.me.id);

  // Celebrate a correct call, then slide over to the leaderboard.
  useEffect(() => {
    if (mine?.correct) void celebrate("small");
    const id = setTimeout(() => {
      if (!touched.current) setTab("leaderboard");
    }, 7000);
    return () => clearTimeout(id);
    // Only on first show of this round's reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  if (!results) return null;
  const total = results.votesA + results.votesB;
  const isLast = view.room.currentRound >= view.room.settings.rounds;
  const self = view.players.find((p) => p.id === view.me.id);
  const readyCount = view.players.filter((p) => p.ready).length;

  const selectTab = (t: Tab) => {
    touched.current = true;
    setTab(t);
  };

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Round results" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1 pop-sm">
        {(["results", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => selectTab(t)}
            className={cn(
              "h-10 rounded-xl font-display font-extrabold transition",
              tab === t ? "bg-ink text-white" : "text-ink hover:bg-ink/5",
            )}
          >
            {t === "results" ? `Round ${round.number} results` : "Leaderboard"}
          </button>
        ))}
      </div>

      {tab === "results" ? (
        <section id="panel-results" role="tabpanel" aria-labelledby="tab-results" className="flex flex-col gap-5">
          <h1 className="font-display text-2xl leading-tight font-extrabold text-balance sm:text-3xl">
            {round.question.prompt}
          </h1>

          <div className="flex flex-col gap-3">
            {(["a", "b"] as const).map((o, i) => (
              <ResultBar
                key={o}
                option={o}
                label={round.question[o]}
                votes={o === "a" ? results.votesA : results.votesB}
                total={total}
                highlight={results.target === o ? (view.room.settings.mode === "minority" ? "underdog" : "crowd") : null}
                delay={reduce ? 0 : 0.3 + i * 0.15}
              />
            ))}
          </div>

          <OutcomeBanner target={results.target} mode={view.room.settings.mode} mine={mine} labels={round.question} />

          <ul className="flex flex-col gap-2" aria-label="Everyone's answers">
            {results.entries.map((e, i) => (
              <motion.li
                key={e.playerId}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduce ? 0 : 1 + i * 0.08 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 pop-sm",
                  e.playerId === view.me.id && "bg-sun-soft",
                )}
              >
                <Avatar avatar={e.avatar} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-extrabold">
                    {e.nickname}
                    {e.playerId === view.me.id && " (you)"}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-semibold text-ink-soft">
                    <span>
                      Picked <ChoiceChip choice={e.vote} labels={round.question} />
                    </span>
                    <span>
                      Predicted <ChoiceChip choice={e.prediction} labels={round.question} />
                    </span>
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-9 min-w-14 items-center justify-center gap-1 rounded-xl border-2 border-ink px-2 font-display font-extrabold",
                    e.points > 0 ? "bg-mint" : "bg-card text-ink-soft",
                  )}
                  aria-label={e.points > 0 ? "Correct, plus one point" : "No points"}
                >
                  {e.points > 0 ? <Check className="size-4" strokeWidth={3} /> : results.target !== "tie" && e.prediction ? <X className="size-4" strokeWidth={3} /> : null}
                  +{e.points}
                </span>
              </motion.li>
            ))}
          </ul>
        </section>
      ) : (
        <section id="panel-leaderboard" role="tabpanel" aria-labelledby="tab-leaderboard" className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-extrabold">
            {isLast ? "Final round done!" : `After round ${round.number} of ${view.room.settings.rounds}`}
          </h1>
          <Leaderboard rows={view.leaderboard} meId={view.me.id} />
        </section>
      )}

      <BottomBar>
        {view.me.isHost ? (
          <Button size="lg" className="w-full" onClick={() => void act({ type: "next" })}>
            {isLast ? (
              <>
                <Flag /> See final results
              </>
            ) : (
              <>
                Next round <ArrowRight />
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            variant={self?.ready ? "mint" : "outline"}
            className="w-full"
            aria-pressed={!!self?.ready}
            onClick={() => void act({ type: "ready", ready: !self?.ready })}
          >
            <Check /> {self?.ready ? "Ready for more!" : "I'm ready"}
          </Button>
        )}
        <p className="pb-1 text-center text-sm font-semibold text-ink-soft" aria-live="polite">
          {readyCount} of {view.players.length} ready
          {view.me.isHost ? " · you control the pace" : " · waiting for the host"}
        </p>
      </BottomBar>
    </div>
  );
}

function ResultBar({
  option,
  label,
  votes,
  total,
  highlight,
  delay,
}: {
  option: Choice;
  label: string;
  votes: number;
  total: number;
  /** Marks the option that scored this round. */
  highlight: "crowd" | "underdog" | null;
  delay: number;
}) {
  const s = OPTION_STYLE[option];
  const pct = percent(votes, total);
  return (
    <div
      className={cn("relative overflow-hidden rounded-3xl pop", s.soft, highlight && "ring-4 ring-sun ring-offset-2 ring-offset-paper")}
    >
      <motion.div
        className={cn("absolute inset-y-0 left-0", s.bg)}
        initial={{ width: "0%" }}
        animate={{ width: `${pct}%` }}
        transition={{ delay, duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        aria-hidden
      />
      <div className="relative flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-card font-display text-xl font-extrabold">
          {s.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl leading-tight font-extrabold">{label}</span>
          <span className="text-sm font-bold">
            {votes} {votes === 1 ? "vote" : "votes"}
          </span>
        </span>
        {highlight && (
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: -8 }}
            transition={{ delay: delay + 1, type: "spring", stiffness: 300, damping: 12 }}
            className="hidden items-center gap-1 rounded-full border-2 border-ink bg-sun px-2.5 py-1 text-xs font-extrabold sm:inline-flex"
          >
            {highlight === "underdog" ? (
              <>
                <span aria-hidden>🦄</span> Underdog pick
              </>
            ) : (
              <>
                <Crown className="size-3.5" /> Crowd&apos;s pick
              </>
            )}
          </motion.span>
        )}
        <span className="font-display text-3xl font-extrabold tabular-nums">{pct}%</span>
      </div>
    </div>
  );
}

function ChoiceChip({ choice, labels }: { choice: Choice | null; labels: { a: string; b: string } }) {
  if (!choice) return <span className="font-bold text-ink/50">nothing</span>;
  return (
    <span
      className={cn(
        "rounded-md border border-ink/40 px-1.5 font-bold text-ink",
        choice === "a" ? "bg-berry-soft" : "bg-sky-soft",
      )}
    >
      {OPTION_STYLE[choice].letter} · {labels[choice]}
    </span>
  );
}

function OutcomeBanner({
  target,
  mode,
  mine,
  labels,
}: {
  /** The option that scored: the crowd's pick, or the underdog's in minority mode. */
  target: "a" | "b" | "tie";
  mode: GameMode;
  mine: { prediction: Choice | null; correct: boolean } | undefined;
  labels: { a: string; b: string };
}) {
  let tone = "bg-card";
  let emoji = "🤔";
  let text: string;
  const underdog = mode === "minority";
  if (target === "tie") {
    tone = "bg-sun";
    emoji = "🤝";
    text = "Dead even! It's a tie, so nobody scores this round.";
  } else if (!mine?.prediction) {
    emoji = "⏰";
    text = underdog
      ? `You didn't predict in time. Fewer people picked "${labels[target]}".`
      : `You didn't predict in time. The crowd picked "${labels[target]}".`;
  } else if (mine.correct) {
    tone = "bg-mint";
    emoji = "🎯";
    text = underdog ? "You spotted the underdog! +1 point" : "You read the room! +1 point";
  } else {
    tone = "bg-berry-soft";
    emoji = "🙃";
    text = underdog
      ? `Not quite! The underdog pick was "${labels[target]}".`
      : `The crowd zigged when you zagged. They picked "${labels[target]}".`;
  }
  return (
    <motion.p
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 16 }}
      role="status"
      className={cn("flex items-center gap-3 rounded-3xl px-5 py-4 font-display text-xl font-extrabold pop", tone)}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      {text}
    </motion.p>
  );
}
