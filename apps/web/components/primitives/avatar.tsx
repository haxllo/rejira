"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-7 text-[11px]",
  lg: "size-8 text-[12px]",
  xl: "size-10 text-[14px]",
  "2xl": "size-12 text-[16px]",
} as const;

type AvatarSize = keyof typeof sizes;

const COLORS = [
  "oklch(0.72 0.18 25)",
  "oklch(0.78 0.15 60)",
  "oklch(0.80 0.16 100)",
  "oklch(0.78 0.16 150)",
  "oklch(0.78 0.14 200)",
  "oklch(0.72 0.15 260)",
  "oklch(0.70 0.16 310)",
  "oklch(0.72 0.16 350)",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

type AvatarProps = {
  name: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
  status?: "online" | "away" | "offline";
};

export function Avatar({
  name,
  size = "md",
  className,
  ring,
  status,
}: AvatarProps) {
  const bg = colorFor(name);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        sizes[size],
        ring && "ring-2 ring-[var(--color-bg)]",
        className,
      )}
      style={{ background: bg }}
      title={name}
    >
      {initials(name)}
      {status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-[var(--color-bg)]",
            status === "online" && "bg-[var(--color-success)]",
            status === "away" && "bg-[var(--color-warning)]",
            status === "offline" && "bg-[var(--color-text-faint)]",
          )}
        />
      )}
    </span>
  );
}

type AvatarGroupProps = {
  names: string[];
  size?: AvatarSize;
  max?: number;
  className?: string;
};

export function AvatarGroup({
  names,
  size = "sm",
  max = 4,
  className,
}: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - visible.length;
  return (
    <div className={cn("flex -space-x-1.5", className)}>
      {visible.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "relative inline-flex items-center justify-center rounded-full bg-[var(--color-surface-3)] text-[var(--color-text-muted)] ring-2 ring-[var(--color-bg)] font-medium",
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
