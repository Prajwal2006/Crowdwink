import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomApp } from "@/components/game/room-app";
import { RoomLoading } from "@/components/game/room-loading";

export const metadata: Metadata = {
  title: "Game room",
  description: "You're invited to a game of Crowdwink. Know your people. Beat the crowd.",
  robots: { index: false },
};

export default function RoomPage() {
  return (
    <Suspense fallback={<RoomLoading />}>
      <RoomApp />
    </Suspense>
  );
}
