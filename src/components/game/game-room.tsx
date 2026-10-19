"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/client/api";
import type { Identity } from "@/lib/client/identity";
import { useRoom, useServerNow } from "@/lib/client/use-room";
import type { GameAction } from "@/lib/types";
import { Countdown } from "./countdown";
import { FinalResults } from "./final-results";
import { GameHeader } from "./game-header";
import { Lobby } from "./lobby";
import { QuestionStage } from "./question-stage";
import { RevealStage } from "./reveal-stage";
import { RoomGone } from "./room-gone";
import { RoomLoading } from "./room-loading";

export type Act = (action: GameAction, opts?: { quiet?: boolean }) => Promise<boolean>;

export function GameRoom({
  identity,
  onExit,
}: {
  identity: Identity;
  onExit: (notice: string | null, playerId?: string) => void;
}) {
  const room = useRoom(identity);
  const { view, error, clockOffset } = room;
  const now = useServerNow(clockOffset, view?.round?.phase === "answering");

  const leaving = useRef(false);

  // Membership problems end this session in the room.
  useEffect(() => {
    if (!error || leaving.current) return;
    if (error.code === "removed") onExit("The host removed you from this room. You can join again with a nickname.", identity.playerId);
    else if (error.code === "not_in_room") onExit("Your seat in this room is gone. Join again with a nickname.", identity.playerId);
  }, [error, identity.playerId, onExit]);

  // Toast when someone joins or leaves, so the room feels alive.
  const seen = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (!view) return;
    const current = new Map(view.players.map((p) => [p.id, p.nickname]));
    const prev = seen.current;
    if (prev) {
      for (const [id, name] of current) if (!prev.has(id) && id !== view.me.id) toast(`👋 ${name} joined`);
      for (const [id, name] of prev) if (!current.has(id)) toast(`${name} left the room`);
    }
    seen.current = current;
  }, [view]);

  const act: Act = useCallback(
    async (action, opts) => {
      try {
        await room.act(action);
        return true;
      } catch (err) {
        if (err instanceof ApiError && (err.code === "removed" || err.code === "not_in_room")) {
          onExit(err.code === "removed" ? "The host removed you from this room." : null, identity.playerId);
          return false;
        }
        if (!opts?.quiet) toast.error(err instanceof Error ? err.message : "Something went wrong.");
        void room.refresh();
        return false;
      }
    },
    [room, onExit, identity.playerId],
  );

  const leave = useCallback(async () => {
    leaving.current = true;
    await act({ type: "leave" }, { quiet: true });
    onExit("You left the room.", identity.playerId);
  }, [act, onExit, identity.playerId]);

  if (error?.code === "room_not_found") return <RoomGone kind="not_found" />;
  if (error?.code === "room_expired") return <RoomGone kind="expired" />;
  if (!view) {
    if (error) {
      return (
        <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <WifiOff className="size-10" />
          <p className="max-w-sm font-semibold text-ink-soft">{error.message}</p>
          <Button onClick={() => void room.refresh()}>
            <RefreshCw /> Try again
          </Button>
        </main>
      );
    }
    return <RoomLoading label="Joining the room…" />;
  }

  const round = view.round;
  let stage: React.ReactNode;
  let stageKey: string;
  if (view.room.status === "lobby") {
    stageKey = `lobby-${view.room.gameNumber}`;
    stage = <Lobby view={view} act={act} isOnline={room.isOnline} />;
  } else if (view.room.status === "finished") {
    stageKey = `final-${view.room.gameNumber}`;
    stage = <FinalResults view={view} act={act} onLeave={leave} />;
  } else if (!round) {
    stageKey = "loading";
    stage = <RoomLoading label="Shuffling questions…" />;
  } else if (round.phase === "answering" && now < round.startsAt) {
    stageKey = `countdown-${view.room.gameNumber}-${round.number}`;
    stage = <Countdown view={view} round={round} now={now} />;
  } else if (round.phase === "answering") {
    stageKey = `question-${view.room.gameNumber}-${round.number}`;
    stage = <QuestionStage view={view} round={round} now={now} act={act} isOnline={room.isOnline} />;
  } else {
    stageKey = `reveal-${view.room.gameNumber}-${round.number}`;
    stage = <RevealStage view={view} round={round} act={act} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <GameHeader view={view} connection={room.connection} onLeave={leave} />
      {error && error.status !== 401 && (
        <div role="status" className="mx-auto mt-2 flex w-full max-w-3xl items-center justify-between gap-3 px-4">
          <p className="flex flex-1 items-center gap-2 rounded-xl bg-sun-soft px-3 py-2 text-sm font-semibold pop-sm">
            <WifiOff className="size-4 shrink-0" /> {error.message}
          </p>
          <Button size="sm" variant="outline" onClick={() => void room.refresh()}>
            Retry
          </Button>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={stageKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4 pb-32 sm:px-6"
        >
          {stage}
        </motion.main>
      </AnimatePresence>
    </MotionConfig>
  );
}
