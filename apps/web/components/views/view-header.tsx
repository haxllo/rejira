"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PlusIcon,
  FilterIcon,
  SortDescIcon,
  ListIcon,
  KanbanIconCustom,
  RowsIcon,
  ShareIcon,
  SparklesIcon,
  MoreHorizontalIcon,
  SearchIcon,
  BookmarkIcon,
  CheckIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type ViewAs = "list" | "board" | "timeline";

export function ViewHeader({
  title,
  description,
  count,
  primary,
  viewAs,
  onViewAsChange,
  onNewIssue,
  onSaveAsView,
  savingState,
  children,
}: {
  title: React.ReactNode;
  description?: string;
  count?: number;
  primary?: React.ReactNode;
  viewAs?: ViewAs;
  onViewAsChange?: (v: ViewAs) => void;
  onNewIssue?: () => void;
  onSaveAsView?: (name: string) => void;
  savingState?: "idle" | "saved";
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 pb-4 pt-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">
            <h1 className="truncate text-[18px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">{title}</h1>
            {typeof count === "number" && (
              <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10.5px] font-mono text-[var(--color-text-faint)]">
                {count}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {viewAs && onViewAsChange && (
            <ViewSwitcher value={viewAs} onChange={onViewAsChange} />
          )}
          {children}
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
            aria-label="Share"
          >
            <ShareIcon size={13} />
          </button>
          {onSaveAsView && <SaveAsViewMenu onSave={onSaveAsView} state={savingState} />}
          {onNewIssue && (
            <button
              onClick={onNewIssue}
              className="ml-1 flex h-7 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-2.5 text-[12px] font-medium text-[var(--color-text-inverse)] hover:opacity-90"
            >
              <PlusIcon size={12} />
              New issue
              <kbd className="ml-1.5 rounded border border-white/20 bg-white/10 px-1 text-[9.5px] font-mono text-white/70">C</kbd>
            </button>
          )}
        </div>
      </div>
      {primary && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
            <input
              type="text"
              placeholder="Search… (⌘K)"
              className="h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] pl-7 pr-2 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-border-strong)] focus:outline-none"
            />
          </div>
          {primary}
        </div>
      )}
    </header>
  );
}

function ViewSwitcher({ value, onChange }: { value: ViewAs; onChange: (v: ViewAs) => void }) {
  const opts: Array<{ value: ViewAs; icon: React.ReactNode; label: string }> = [
    { value: "list", icon: <ListIcon size={12} />, label: "List" },
    { value: "board", icon: <KanbanIconCustom size={12} />, label: "Board" },
    { value: "timeline", icon: <RowsIcon size={12} />, label: "Timeline" },
  ];
  return (
    <div className="flex h-7 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-label={o.label}
          className={cn(
            "relative flex h-6 w-7 items-center justify-center rounded text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]",
            value === o.value && "text-[var(--color-text)]",
          )}
        >
          {value === o.value && (
            <motion.div
              layoutId="view-switcher"
              className="absolute inset-0 rounded bg-[var(--color-surface-3)]"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative">{o.icon}</span>
        </button>
      ))}
    </div>
  );
}

function SaveAsViewMenu({
  onSave,
  state,
}: {
  onSave: (name: string) => void;
  state?: "idle" | "saved";
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useEffect(() => {
    if (state === "saved") {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
          state === "saved" && "text-[var(--color-success)]",
        )}
        aria-label="Save as view"
      >
        {state === "saved" ? <CheckIcon size={13} /> : <BookmarkIcon size={13} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="absolute right-0 top-9 z-30 w-64 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] p-2.5 shadow-[var(--shadow-lg)]"
          >
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              Save as view
            </div>
            <p className="mb-2 text-[11px] text-[var(--color-text-muted)]">
              Save the current filter, group, and sort as a named view.
            </p>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  onSave(name.trim());
                  setName("");
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="View name"
              className="h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-border-strong)] focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                onClick={() => setOpen(false)}
                className="h-6 rounded px-2 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
              <button
                disabled={!name.trim()}
                onClick={() => {
                  onSave(name.trim());
                  setName("");
                }}
                className="flex h-6 items-center gap-1 rounded bg-[var(--color-text)] px-2 text-[11px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 disabled:opacity-40"
              >
                {state === "saved" ? <CheckIcon size={10} /> : <BookmarkIcon size={10} />}
                {state === "saved" ? "Saved" : "Save"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
