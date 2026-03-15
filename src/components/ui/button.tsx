import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[1rem] border text-sm font-semibold tracking-[-0.02em] transition-[transform,box-shadow,background-color,color,border-color] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none hover:-translate-y-0.5 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "border-[#9bffe9]/18 bg-[linear-gradient(180deg,rgba(111,255,220,0.28),rgba(16,89,75,0.62))] text-white shadow-[0_18px_42px_rgba(0,0,0,0.24)] hover:border-[#b8fff0]/30 hover:bg-[linear-gradient(180deg,rgba(132,255,227,0.36),rgba(21,107,91,0.7))] hover:shadow-[0_20px_48px_rgba(0,0,0,0.32)]",
        destructive:
          "border-red-400/18 bg-[linear-gradient(180deg,rgba(255,117,98,0.28),rgba(120,31,31,0.7))] text-white shadow-[0_18px_42px_rgba(60,10,10,0.28)] hover:border-red-300/28 hover:bg-[linear-gradient(180deg,rgba(255,131,113,0.34),rgba(135,34,34,0.76))] hover:shadow-[0_20px_48px_rgba(60,10,10,0.34)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border-white/12 bg-white/4 text-white/88 shadow-[0_16px_36px_rgba(0,0,0,0.18)] hover:border-[#9bffe9]/18 hover:bg-white/8 hover:text-white",
        secondary:
          "border-[#9bffe9]/12 bg-[linear-gradient(180deg,rgba(17,30,34,0.96),rgba(10,18,21,0.92))] text-white shadow-[0_16px_36px_rgba(0,0,0,0.2)] hover:border-[#9bffe9]/22 hover:bg-[linear-gradient(180deg,rgba(22,38,43,0.98),rgba(12,22,25,0.94))]",
        ghost:
          "border-transparent bg-transparent text-white/68 shadow-none hover:border-white/8 hover:bg-white/6 hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-[0.8rem] px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-4 has-[>svg]:px-3",
        lg: "h-12 px-6 text-sm has-[>svg]:px-5",
        icon: "size-11",
        "icon-xs": "size-7 rounded-[0.8rem] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
