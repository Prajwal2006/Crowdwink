"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CODE_CHARS = /[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g;

export function JoinCodeForm({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={cn("flex w-full flex-col gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        // Accept a pasted invite link too.
        const fromLink = /\/r\/([A-Za-z0-9]+)/.exec(code)?.[1];
        const clean = (fromLink ?? code).toUpperCase().replace(CODE_CHARS, "");
        if (clean.length !== 6) {
          setError("Room codes are 6 characters, like K7PQ2M.");
          return;
        }
        router.push(`/r/${clean}`);
      }}
    >
      <label htmlFor="join-code" className="sr-only">
        Room code
      </label>
      <div className="flex gap-2">
        <Input
          id="join-code"
          value={code}
          autoFocus={autoFocus}
          onChange={(e) => {
            setError(null);
            setCode(e.target.value.toUpperCase().slice(0, 64));
          }}
          placeholder="Room code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? "join-code-error" : undefined}
          className="h-14 font-display text-xl tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" variant="sun" size="lg" className="h-14 shrink-0">
          Join <ArrowRight />
        </Button>
      </div>
      {error && (
        <p id="join-code-error" role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
