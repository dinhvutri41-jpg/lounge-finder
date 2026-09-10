import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-mid",
  {
    variants: {
      variant: {
        primary: "bg-primary text-surface hover:bg-primary-hover",
        outline:
          "bg-surface text-primary-mid ring-1 ring-primary hover:bg-primary-soft",
        ghost: "bg-transparent text-primary-mid hover:bg-primary-soft",
        subtle: "bg-surface text-muted ring-1 ring-border hover:bg-primary-soft",
      },
      size: {
        md: "rounded-md px-5 py-3 text-sm",
        sm: "rounded-sm px-3 py-2 text-sm",
        pill: "rounded-full p-1.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
