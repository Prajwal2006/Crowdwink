import { LogoMark } from "@/components/brand/logo";

export function RoomLoading({ label = "Finding your room…" }: { label?: string }) {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-8" aria-busy="true">
      <LogoMark className="size-16 animate-[float_2s_ease-in-out_infinite]" />
      <p className="font-display text-xl font-bold text-ink-soft">{label}</p>
    </main>
  );
}
