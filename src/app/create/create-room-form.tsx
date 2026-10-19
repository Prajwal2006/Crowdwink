"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Loader2, Rocket, Settings2 } from "lucide-react";
import { CategoryPicker, RoundsPicker } from "@/components/game/settings-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { questionsIn, type CategoryId } from "@/data/questions";
import { api, ApiError } from "@/lib/client/api";
import { saveIdentity } from "@/lib/client/identity";
import { DEFAULT_ROUNDS, NICKNAME_MAX, ROOM_NAME_MAX } from "@/lib/game/constants";
import type { JoinResponse } from "@/lib/types";

export function CreateRoomForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [customize, setCustomize] = useState(false);
  const [busy, setBusy] = useState<"quick" | "custom" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = questionsIn(categories).length;
  const notEnough = available < rounds;

  async function create(mode: "quick" | "custom") {
    setError(null);
    if (!nickname.trim()) {
      setError("Pick a nickname so your friends know who's hosting.");
      document.getElementById("nickname")?.focus();
      return;
    }
    if (mode === "custom" && notEnough) {
      setError(`Those categories only have ${available} questions. Add categories or play fewer rounds.`);
      return;
    }
    setBusy(mode);
    try {
      const body =
        mode === "quick"
          ? { nickname }
          : { nickname, name: name || undefined, rounds, categories };
      const res = await api<JoinResponse>("/api/rooms", { body });
      saveIdentity({ code: res.code, playerId: res.playerId, token: res.token, nickname: res.nickname });
      router.push(`/r/${res.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the room. Please try again.");
      setBusy(null);
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void create(customize ? "custom" : "quick");
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="nickname">Your nickname</Label>
        <Input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={NICKNAME_MAX * 2}
          placeholder="e.g. Sam 🌮"
          autoComplete="nickname"
          autoFocus
          className="h-14 text-lg"
        />
      </div>

      {!customize && (
        <Button type="submit" size="xl" disabled={!!busy} className="w-full">
          {busy === "quick" ? <Loader2 className="animate-spin" /> : <Rocket />}
          Quick start
        </Button>
      )}
      {!customize && (
        <p className="-mt-3 text-center text-sm font-semibold text-muted-foreground">
          {DEFAULT_ROUNDS} rounds · all categories · you can tweak it in the lobby
        </p>
      )}

      <div className="rounded-3xl bg-card pop">
        <button
          type="button"
          onClick={() => setCustomize((v) => !v)}
          aria-expanded={customize}
          aria-controls="customize-panel"
          className="flex w-full items-center justify-between gap-2 rounded-3xl px-5 py-4 text-left font-display text-lg font-extrabold"
        >
          <span className="inline-flex items-center gap-2">
            <Settings2 className="size-5" /> Customize the game
          </span>
          <ChevronDown className={`size-5 transition ${customize ? "rotate-180" : ""}`} />
        </button>
        {customize && (
          <div id="customize-panel" className="flex flex-col gap-6 border-t-2 border-ink/10 px-5 pt-4 pb-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="room-name">Room name (optional)</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={ROOM_NAME_MAX}
                placeholder={nickname.trim() ? `${nickname.trim()}'s crowd` : "Friday Night Crew"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <span id="rounds-label" className="text-sm font-bold">
                Rounds
              </span>
              <RoundsPicker value={rounds} onChange={setRounds} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">Categories</span>
              <CategoryPicker value={categories} onChange={setCategories} />
              <p className={`text-sm font-semibold ${notEnough ? "text-destructive" : "text-muted-foreground"}`}>
                {available} questions available{notEnough ? `, not enough for ${rounds} rounds` : ""}
              </p>
            </div>
            <Button type="submit" size="lg" disabled={!!busy || notEnough} className="w-full">
              {busy === "custom" ? <Loader2 className="animate-spin" /> : <Rocket />}
              Create room
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-destructive bg-destructive/10 px-4 py-3 font-semibold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
