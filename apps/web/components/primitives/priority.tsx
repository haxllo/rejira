import * as React from "react";
import { cn } from "@/lib/utils";

export type PriorityKey = "urgent" | "high" | "medium" | "low" | "none";

const PRIORITY_META: Record<
  PriorityKey,
  { label: string; color: string; bars: number }
> = {
  urgent: { label: "Urgent", color: "var(--color-prio-urgent)", bars: 3 },
  high: { label: "High", color: "var(--color-prio-high)", bars: 3 },
  medium: { label: "Medium", color: "var(--color-prio-medium)", bars: 2 },
  low: { label: "Low", color: "var(--color-prio-low)", bars: 1 },
  none: { label: "No priority", color: "var(--color-prio-none)", bars: 0 },
};

export function PriorityIcon({
  priority,
  size = 14,
  className,
}: {
  priority: PriorityKey;
  size?: number;
  className?: string;
}) {
  const { color, bars, label } = PRIORITY_META[priority];
  const h = size;
  const w = size * (4 / 3);
  const gap = size * 0.18;
  const barW = (w - gap * 2) / 3;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("inline-block align-middle", className)}
      aria-label={label}
    >
      {[0, 1, 2].map((i) => {
        const barH = (h * (i + 1)) / 3;
        const y = h - barH;
        const x = i * (barW + gap);
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={0.5}
            fill={i < bars ? color : "transparent"}
            stroke={color}
            strokeWidth={0.6}
            opacity={i < bars ? 1 : 0.35}
          />
        );
      })}
    </svg>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: PriorityKey;
  className?: string;
}) {
  const { label, color } = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]",
        className,
      )}
    >
      <PriorityIcon priority={priority} size={11} />
      {label}
    </span>
  );
}

export function getPriorityLabel(p: PriorityKey) {
  return PRIORITY_META[p].label;
}
