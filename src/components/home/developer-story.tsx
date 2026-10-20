import Image from "next/image";
import Link from "next/link";
import { Briefcase, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEVELOPER = {
  name: "Prajwal",
  linkedin: "https://www.linkedin.com/in/prajwal-nh/",
  portfolio: "https://prajwalnh.vercel.app/",
};

/** "Made with 💛 by Prajwal" credit that links to the story on the home page. */
export function BuiltBy({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-sm font-semibold text-muted-foreground", className)}>
      Made with <span aria-hidden>💛</span>
      <span className="sr-only">love</span> by{" "}
      <Link href="/#story" className="font-bold text-ink underline underline-offset-4 hover:text-grape">
        {DEVELOPER.name}
      </Link>
    </p>
  );
}

export function DeveloperStory() {
  return (
    <section id="story" aria-labelledby="story-title" className="scroll-mt-6">
      <h2 id="story-title" className="font-display text-4xl font-extrabold sm:text-5xl">
        The story behind it
      </h2>
      <div className="mt-8 grid overflow-hidden rounded-3xl bg-card pop-lg md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="relative aspect-square w-full border-b-[3px] border-ink md:aspect-auto md:min-h-[26rem] md:border-r-[3px] md:border-b-0">
          <Image
            src="/prajwal-nh.jpg"
            alt="Prajwal, the developer of Crowdwink, smiling in sunglasses while standing in the sea at sunset"
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover"
            style={{ objectPosition: "50% 55%" }}
          />
        </div>

        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <p className="w-fit rounded-full border-2 border-ink bg-sun px-3 py-1 text-sm font-extrabold">
            Hi, I&apos;m {DEVELOPER.name} <span aria-hidden>👋</span>
          </p>
          <h3 className="font-display text-3xl font-extrabold">I wanted a game that starts with a link</h3>
          <p className="font-medium text-ink-soft">
            Every time my friends wanted to play something together, half the night went to downloads, sign-ups and
            &ldquo;wait, which app?&rdquo; I wanted something you could drop in the group chat and start playing in
            seconds.
          </p>
          <p className="font-medium text-ink-soft">
            So I built Crowdwink. The fun part isn&apos;t knowing the right answer, because there isn&apos;t one.
            It&apos;s knowing your people. It&apos;s free, has no accounts and no ads, and every question is written
            by hand.
          </p>
          <p className="font-medium text-ink-soft">If it gets your group arguing (the fun kind), it was worth building.</p>

          <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
            <Button asChild variant="sky" className="flex-1">
              <a
                href={DEVELOPER.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${DEVELOPER.name} on LinkedIn (opens in a new tab)`}
              >
                <Briefcase /> LinkedIn
              </a>
            </Button>
            <Button asChild variant="mint" className="flex-1">
              <a
                href={DEVELOPER.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${DEVELOPER.name}'s portfolio website (opens in a new tab)`}
              >
                <Globe /> Portfolio
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
