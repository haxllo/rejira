import * as React from "react";
import { cn } from "@/lib/utils";

const LABEL_COLORS = [
  "var(--color-label-1)",
  "var(--color-label-2)",
  "var(--color-label-3)",
  "var(--color-label-4)",
  "var(--color-label-5)",
  "var(--color-label-6)",
  "var(--color-label-7)",
  "var(--color-label-8)",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_COLORS[h % LABEL_COLORS.length];
}

type LabelChipProps = {
  name: string;
  className?: string;
  size?: "sm" | "md";
};

export function LabelChip({ name, className, size = "md" }: LabelChipProps) {
  const color = colorFor(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] pr-2 font-medium text-[var(--color-text-muted)]",
        size === "sm" ? "pl-1 py-0 text-[10px]" : "pl-1.5 py-0.5 text-[11px]",
        className,
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
        )}
        style={{ background: color }}
      />
      {name}
    </span>
  );
}

export function LabelDot({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-1.5 rounded-full align-middle", className)}
      style={{ background: colorFor(name) }}
    />
  );
}
