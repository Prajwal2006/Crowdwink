import { cn } from "@/lib/utils";

/** Sticky action area at the bottom of the screen: big touch targets, thumb-friendly. */
export function BottomBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t-[2.5px] border-ink bg-paper/95 backdrop-blur safe-bottom">
      <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pt-3 sm:px-6", className)}>{children}</div>
    </div>
  );
}
