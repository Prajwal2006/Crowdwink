import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { BuiltBy } from "@/components/home/developer-story";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <Link href="/" className="rounded-xl" aria-label="Crowdwink home">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
      Crowdwink is free to play. No accounts, no ads, just your people.
      <BuiltBy className="mt-1" />
    </footer>
  );
}
