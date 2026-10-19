import { AVATARS } from "@/lib/game/constants";
import { cn } from "@/lib/utils";

export function Avatar({
  avatar,
  size = "md",
  className,
  dim,
}: {
  avatar: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  dim?: boolean;
}) {
  const a = AVATARS[avatar % AVATARS.length]!;
  const sizes = {
    xs: "size-7 text-sm border-2",
    sm: "size-9 text-lg border-2",
    md: "size-12 text-2xl border-[2.5px]",
    lg: "size-16 text-3xl border-[3px]",
    xl: "size-24 text-5xl border-[3px]",
  }[size];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-ink leading-none transition",
        sizes,
        dim && "opacity-45 grayscale",
        className,
      )}
      style={{ backgroundColor: a.color }}
    >
      {a.emoji}
    </span>
  );
}
