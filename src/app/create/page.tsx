import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CreateRoomForm } from "./create-room-form";

export const metadata: Metadata = { title: "Create a room" };

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-lg px-4 pt-4 pb-16 sm:px-6">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Start a room</h1>
        <p className="mt-2 mb-8 text-lg font-medium text-ink-soft">
          You&apos;ll be the host. Share the link, and your friends jump straight in. No accounts needed.
        </p>
        <CreateRoomForm />
      </main>
    </>
  );
}
