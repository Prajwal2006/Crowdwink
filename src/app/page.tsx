import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { JoinCodeForm } from "@/components/home/join-code-form";
import { SampleQuestion } from "@/components/home/sample-question";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORIES, QUESTIONS } from "@/data/questions";

const STEPS = [
  {
    emoji: "🗳️",
    title: "Answer honestly",
    body: "Everyone gets the same two-option question and secretly picks their answer.",
    color: "bg-berry-soft",
  },
  {
    emoji: "🔮",
    title: "Predict the crowd",
    body: "Then guess which option most of the room picked. Your own vote counts too.",
    color: "bg-sky-soft",
  },
  {
    emoji: "🥁",
    title: "Big reveal",
    body: "Votes flip over all at once. See who picked what and who read the room.",
    color: "bg-sun-soft",
  },
  {
    emoji: "🏆",
    title: "Climb the board",
    body: "Score points every round. Whoever knows the group best wins bragging rights.",
    color: "bg-mint-soft",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader>
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <a href="#how-to-play">How to play</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/join">Join a room</Link>
        </Button>
      </SiteHeader>

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-6 pb-10 sm:px-6 sm:pt-10">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="mint">✓ 100% free</Badge>
              <Badge variant="sky">No sign-up</Badge>
              <Badge variant="berry">2–8 players</Badge>
            </div>
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
              Know your people.{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Beat the crowd.</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 rounded-full bg-sun sm:h-5"
                />
              </span>
            </h1>
            <p className="max-w-xl text-lg font-medium text-ink-soft sm:text-xl">
              Crowdwink is a party game for your group chat. Answer silly questions, predict what most of your friends
              picked, and find out who really reads the room.
            </p>
            <div className="flex flex-col gap-4 sm:max-w-lg">
              <Button asChild size="xl" className="w-full">
                <Link href="/create">
                  <Sparkles /> Create a room <ArrowRight />
                </Link>
              </Button>
              <div className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                <span className="h-0.5 flex-1 rounded bg-ink/15" />
                or join friends
                <span className="h-0.5 flex-1 rounded bg-ink/15" />
              </div>
              <JoinCodeForm />
            </div>
          </div>
          <div className="relative">
            <div aria-hidden className="absolute -top-6 -right-2 hidden rotate-12 text-5xl lg:block">
              ✨
            </div>
            <SampleQuestion />
          </div>
        </section>

        {/* How to play */}
        <section id="how-to-play" className="scroll-mt-6">
          <h2 className="font-display text-4xl font-extrabold sm:text-5xl">How to play</h2>
          <p className="mt-2 text-lg font-medium text-ink-soft">One round takes about a minute. Play as many as you like.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`flex flex-col gap-2 rounded-3xl p-5 pop ${s.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-4xl" aria-hidden>
                    {s.emoji}
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-ink font-display text-lg font-extrabold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-extrabold">{s.title}</h3>
                <p className="font-medium text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Scoring */}
        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-display text-4xl font-extrabold sm:text-5xl">Scoring is simple</h2>
            <p className="mt-2 text-lg font-medium text-ink-soft">
              It isn&apos;t about having the &quot;right&quot; answer. It&apos;s about knowing what your friends will pick.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            <li className="rounded-3xl bg-mint p-5 pop">
              <p className="font-display text-5xl font-extrabold">+1</p>
              <p className="mt-1 font-bold">Correctly predict the majority</p>
            </li>
            <li className="rounded-3xl bg-card p-5 pop">
              <p className="font-display text-5xl font-extrabold">0</p>
              <p className="mt-1 font-bold">Wrong guess? No points, no penalty</p>
            </li>
            <li className="rounded-3xl bg-sun p-5 pop">
              <p className="font-display text-5xl font-extrabold">🤝</p>
              <p className="mt-1 font-bold">Perfect tie? Nobody scores that round</p>
            </li>
          </ul>
        </section>

        {/* Categories */}
        <section className="rounded-3xl bg-grape p-6 text-white pop-lg sm:p-10">
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
            {Math.floor(QUESTIONS.length / 10) * 10}+ questions. Zero homework.
          </h2>
          <p className="mt-2 max-w-2xl font-medium text-white/85">
            Hand-written, family-friendly, and built to start arguments (the fun kind). The host picks the categories.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <li key={c.id} className="rounded-full border-2 border-ink bg-card px-3 py-1.5 font-bold text-ink">
                <span aria-hidden>{c.emoji}</span> {c.label}
              </li>
            ))}
          </ul>
          <Button asChild variant="sun" size="lg" className="mt-8">
            <Link href="/create">
              Start a game now <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
