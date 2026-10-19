import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-2xl border-[2.5px] border-ink bg-card px-4 text-base font-semibold text-ink shadow-pop-sm transition-[box-shadow,transform] outline-none placeholder:font-medium placeholder:text-muted-foreground/80 focus-visible:shadow-pop focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-grape disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
