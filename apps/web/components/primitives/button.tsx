"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-1.5",
    "font-medium select-none whitespace-nowrap",
    "transition-[background-color,color,box-shadow,transform] duration-[120ms]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-text)] text-[var(--color-text-inverse)] hover:bg-white",
        secondary:
          "bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-3)]",
        ghost:
          "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-hover)]",
        danger:
          "bg-[var(--color-danger)]/12 text-[var(--color-danger)] border border-[var(--color-danger)]/24 hover:bg-[var(--color-danger)]/18",
        accent:
          "bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]",
        outline:
          "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-hover)]",
        link: "text-[var(--color-text)] underline-offset-2 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-[var(--text-xs)] rounded-[var(--radius-sm)]",
        sm: "h-7 px-2.5 text-[var(--text-sm)] rounded-[var(--radius-sm)]",
        md: "h-8 px-3 text-[var(--text-base)] rounded-[var(--radius-md)]",
        lg: "h-9 px-3.5 text-[var(--text-md)] rounded-[var(--radius-md)]",
        icon: "size-8 rounded-[var(--radius-md)]",
        "icon-sm": "size-6 rounded-[var(--radius-sm)]",
        "icon-xs": "size-5 rounded-[var(--radius-sm)]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = HTMLMotionProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
