import type { Metadata } from "next";
import Link from "next/link";
import { JoinCodeForm } from "@/components/home/join-code-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Join a room" };

export default function JoinPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-lg px-4 pt-4 pb-16 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Join your crowd</h1>
        <p className="mt-2 mb-8 text-lg font-medium text-ink-soft">
          Enter the 6-character code from your host, or paste the invite link.
        </p>
        <div className="rounded-3xl bg-card p-5 pop-lg">
          <JoinCodeForm autoFocus />
        </div>
        <p className="mt-6 text-center font-semibold text-muted-foreground">
          No code?{" "}
          <Link href="/create" className="font-bold text-grape underline-offset-4 hover:underline">
            Start your own room
          </Link>
        </p>
      </main>
    </>
  );
}
