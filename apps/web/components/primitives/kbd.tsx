import * as React from "react";
import { cn } from "@/lib/utils";

type KbdProps = React.HTMLAttributes<HTMLElement> & {
  keys: string[];
};

export function Kbd({ keys, className, ...props }: KbdProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 align-middle",
        className,
      )}
      {...props}
    >
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          <kbd
            className={cn(
              "inline-flex h-[18px] min-w-[18px] items-center justify-center px-1",
              "rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]",
              "bg-[var(--color-surface-2)] text-[10px] font-medium",
              "text-[var(--color-text-muted)] font-mono leading-none",
              "shadow-[0_1px_0_oklch(0_0_0_/_0.4)]",
            )}
          >
            {k}
          </kbd>
          {i < keys.length - 1 && (
            <span className="text-[10px] text-[var(--color-text-faint)] mx-0.5">
              +
            </span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
}

export function ShortcutHint({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto pl-3">
      <Kbd keys={keys} />
    </span>
  );
}
