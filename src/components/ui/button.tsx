import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-bold select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-grape",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground pop pressable",
        sun: "bg-sun text-ink pop pressable",
        mint: "bg-mint text-ink pop pressable",
        outline: "bg-card text-ink pop pressable",
        berry: "bg-berry text-ink pop pressable",
        sky: "bg-sky text-ink pop pressable",
        destructive: "bg-destructive text-white pop pressable",
        ghost: "text-ink hover:bg-ink/5 rounded-xl",
        link: "text-grape underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-5 text-base rounded-2xl",
        sm: "h-9 px-3 text-sm rounded-xl",
        lg: "h-14 px-7 text-lg rounded-2xl",
        xl: "h-16 px-8 text-xl rounded-3xl",
        icon: "size-11 rounded-xl",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
