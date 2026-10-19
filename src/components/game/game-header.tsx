"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, LogOut } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConnectionState } from "@/lib/client/realtime";
import { inviteUrl } from "@/lib/client/room-code";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HelpSheet } from "./help-sheet";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function GameHeader({
  view,
  connection,
  onLeave,
}: {
  view: RoomView;
  connection: ConnectionState;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { room } = view;
  const playing = room.status === "playing" && room.currentRound > 0;

  return (
    <header className="sticky top-0 z-30 border-b-[2.5px] border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/" aria-label="Crowdwink home (you stay in the room)" className="rounded-full">
          <LogoMark className="size-9" />
        </Link>

        <button
          type="button"
          onClick={async () => {
            const ok = await copyText(inviteUrl(room.code));
            if (ok) {
              setCopied(true);
              toast.success("Invite link copied!");
              setTimeout(() => setCopied(false), 1500);
            } else {
              toast(`Room code: ${room.code}`);
            }
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-sun px-2.5 font-mono text-sm font-bold tracking-widest pop-sm pressable"
          aria-label={`Room code ${room.code}. Copy invite link`}
        >
          {room.code}
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>

        {playing && (
          <span className="ml-1 hidden font-display text-sm font-extrabold sm:inline">
            Round {room.currentRound}/{room.settings.rounds}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ConnectionPill state={connection} />
          <HelpSheet />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Leave room">
                <LogOut />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leave this room?</DialogTitle>
                <DialogDescription>
                  You&apos;ll lose your seat and score.{view.me.isHost ? " Hosting passes to another player." : ""}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Stay</Button>
                </DialogClose>
                <Button variant="destructive" onClick={onLeave}>
                  Leave room
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {playing && (
        <div
          className="h-1.5 bg-ink/10"
          role="progressbar"
          aria-label="Game progress"
          aria-valuemin={0}
          aria-valuemax={room.settings.rounds}
          aria-valuenow={room.currentRound}
        >
          <div
            className="h-full bg-grape transition-[width] duration-500"
            style={{ width: `${(room.currentRound / room.settings.rounds) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}

function ConnectionPill({ state }: { state: ConnectionState }) {
  const label = state === "live" ? "Live" : state === "connecting" ? "Connecting" : "Offline";
  return (
    <span
      role="status"
      aria-label={`Connection: ${label}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border-2 border-ink bg-card px-2.5 text-xs font-bold"
    >
      <span
        className={cn(
          "size-2.5 rounded-full",
          state === "live" ? "bg-mint" : state === "connecting" ? "animate-pulse bg-sun" : "bg-tomato",
        )}
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
