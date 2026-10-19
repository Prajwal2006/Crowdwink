import { cn } from "@/lib/utils";

/** The winking crowd face. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-10", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="24" cy="24" r="21" fill="var(--sun)" stroke="var(--ink)" strokeWidth="3.5" />
      <circle cx="16.5" cy="20" r="3.4" fill="var(--ink)" />
      <path d="M27.5 20.5c1.8-2.6 5.2-2.6 7 0" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M15 28.5c2.6 4.6 15.4 4.6 18 0" fill="none" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="35.5" cy="27.5" r="2.6" fill="var(--berry)" opacity="0.85" />
    </svg>
  );
}

export function Wordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const text = { sm: "text-xl", md: "text-2xl", lg: "text-4xl sm:text-5xl" }[size];
  const mark = { sm: "size-7", md: "size-9", lg: "size-12 sm:size-14" }[size];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={mark} />
      <span className={cn("font-display font-extrabold tracking-tight text-ink", text)}>
        crowd<span className="text-grape">wink</span>
      </span>
    </span>
  );
}
