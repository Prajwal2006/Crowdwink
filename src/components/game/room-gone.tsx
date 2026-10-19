import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const COPY = {
  not_found: {
    emoji: "🔍",
    title: "Room not found",
    body: "That code doesn't match any room. Double-check it with your host. Codes are 6 letters and numbers.",
  },
  expired: {
    emoji: "⌛",
    title: "This room has expired",
    body: "Rooms close after a day without activity. Start a fresh one, it takes two seconds.",
  },
} as const;

export function RoomGone({ kind }: { kind: keyof typeof COPY }) {
  const c = COPY[kind];
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Link href="/" aria-label="Crowdwink home">
        <Wordmark />
      </Link>
      <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl bg-card p-8 pop-lg">
        <span className="text-6xl" aria-hidden>
          {c.emoji}
        </span>
        <h1 className="font-display text-3xl font-extrabold">{c.title}</h1>
        <p className="font-medium text-ink-soft">{c.body}</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/create">Create a room</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/join">Enter another code</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
