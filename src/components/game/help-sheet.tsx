"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DEFAULT_MODE, MODE_INFO, type GameMode } from "@/lib/game/modes";

export function HelpSheet({ mode = DEFAULT_MODE }: { mode?: GameMode }) {
  const underdog = mode === "minority";
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="How to play and scoring rules">
          <HelpCircle />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle>How it works</SheetTitle>
        <SheetDescription className="text-base">Know your people. Beat the crowd.</SheetDescription>
        <p className={`rounded-2xl px-4 py-3 font-semibold pop-sm ${underdog ? "bg-berry-soft" : "bg-mint-soft"}`}>
          <span aria-hidden>{MODE_INFO[mode].emoji}</span> This game: <b>{MODE_INFO[mode].label}</b>.{" "}
          {MODE_INFO[mode].rule}
        </p>
        <ol className="flex flex-col gap-3">
          {[
            ["🗳️", "Vote", "Pick the answer that's true for you. Nobody sees it until the reveal."],
            [
              "🔮",
              "Predict",
              underdog
                ? "Guess which option FEWER people picked. Your own vote counts too."
                : "Guess which option MOST of the room picked. Your own vote counts toward the majority.",
            ],
            ["🥁", "Reveal", "Everyone's answers flip over at the same time."],
          ].map(([emoji, title, body]) => (
            <li key={title} className="flex gap-3 rounded-2xl bg-card p-4 pop-sm">
              <span className="text-2xl" aria-hidden>
                {emoji}
              </span>
              <div>
                <p className="font-display text-lg font-extrabold">{title}</p>
                <p className="font-medium text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="mt-2 font-display text-2xl font-extrabold">Scoring</h3>
        <ul className="flex flex-col gap-2 font-semibold">
          <li className="rounded-2xl bg-mint-soft px-4 py-3 pop-sm">
            <b>+1 point</b> for correctly predicting the {MODE_INFO[mode].side}.
          </li>
          <li className="rounded-2xl bg-card px-4 py-3 pop-sm">
            <b>0 points</b> for a wrong or missing prediction. No penalties.
          </li>
          <li className="rounded-2xl bg-sun-soft px-4 py-3 pop-sm">
            <b>Exact tie?</b> Nobody scores that round.
          </li>
          <li className="rounded-2xl bg-sky-soft px-4 py-3 pop-sm">
            <b>Accuracy</b> = correct predictions ÷ predictions in rounds that had a majority.
          </li>
        </ul>
        <p className="text-sm font-medium text-muted-foreground">
          Each question has a 60-second timer. The host can reveal early, and the round ends on its own once everyone
          has answered. Scores are calculated on the server, so nobody can fudge them. Most points after the last
          round wins.
        </p>
      </SheetContent>
    </Sheet>
  );
}
