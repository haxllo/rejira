"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { XIcon, SearchIcon } from "@/components/icons";
import { useUI } from "@/lib/state/ui";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  label: string;
  group: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "Open command palette", group: "Navigation" },
  { keys: ["G", "I"], label: "Go to Inbox", group: "Navigation" },
  { keys: ["G", "M"], label: "Go to My Issues", group: "Navigation" },
  { keys: ["G", "H"], label: "Go to Home", group: "Navigation" },
  { keys: ["G", "P"], label: "Go to current project", group: "Navigation" },
  { keys: ["G", "C"], label: "Go to active cycle", group: "Navigation" },
  { keys: ["G", "S"], label: "Go to Search", group: "Navigation" },
  { keys: ["G", "V"], label: "Go to All views", group: "Navigation" },
  { keys: ["/"], label: "Focus search", group: "Navigation" },

  { keys: ["C"], label: "Create new issue", group: "Create" },
  { keys: ["⌘", "↵"], label: "Submit new issue", group: "Create" },
  { keys: ["Esc"], label: "Cancel / close", group: "Create" },

  { keys: ["1"], label: "Set status · Backlog", group: "Issue row" },
  { keys: ["2"], label: "Set status · Todo", group: "Issue row" },
  { keys: ["3"], label: "Set status · In Progress", group: "Issue row" },
  { keys: ["4"], label: "Set status · In Review", group: "Issue row" },
  { keys: ["5"], label: "Set status · Done", group: "Issue row" },
  { keys: ["P"], label: "Cycle priority", group: "Issue row" },
  { keys: ["A"], label: "Assign", group: "Issue row" },
  { keys: ["L"], label: "Add label", group: "Issue row" },
  { keys: ["D"], label: "Set due date", group: "Issue row" },
  { keys: ["E"], label: "Open in editor", group: "Issue row" },

  { keys: ["⇧", "D"], label: "Cycle density (Compact / Default / Roomy)", group: "View" },
  { keys: ["⌘", "/"], label: "Toggle cheatsheet", group: "View" },
  { keys: ["?"], label: "Show this cheatsheet", group: "View" },
];

export function Cheatsheet() {
  const open = useUI((s) => s.cheatsheetOpen);
  const close = useUI((s) => s.closeCheatsheet);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setQuery("");
      const id = setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>('input[placeholder="Filter shortcuts…"]');
        el?.focus();
      }, 60);
      return () => clearTimeout(id);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return SHORTCUTS;
    const q = query.toLowerCase();
    return SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.keys.some((k) => k.toLowerCase() === q),
    );
  }, [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Shortcut[]>();
    for (const s of filtered) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[var(--color-overlay)] px-4 pt-[10vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 8, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-[var(--shadow-drawer)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Keyboard cheatsheet"
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2.5">
              <SearchIcon size={13} className="text-[var(--color-text-faint)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter shortcuts…"
                className="flex-1 bg-transparent text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
              />
              <button
                onClick={close}
                aria-label="Close cheatsheet"
                className="grid size-6 place-items-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
              >
                <XIcon size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {grouped.length === 0 && (
                <div className="px-3 py-8 text-center text-[12px] text-[var(--color-text-faint)]">
                  No shortcuts match "{query}"
                </div>
              )}
              {grouped.map(([group, list]) => (
                <section key={group} className="mb-3">
                  <h3 className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
                    {group}
                  </h3>
                  <ul>
                    {list.map((s, i) => (
                      <li key={`${s.label}-${i}`}>
                        <div className="flex items-center justify-between rounded px-2 py-1.5 text-[12.5px] hover:bg-[var(--color-surface-2)]">
                          <span className="text-[var(--color-text-muted)]">{s.label}</span>
                          <span className="flex items-center gap-0.5">
                            {s.keys.map((k, j) => (
                              <React.Fragment key={j}>
                                <KeyCap>{k}</KeyCap>
                                {j < s.keys.length - 1 && (
                                  <span className="text-[10px] text-[var(--color-text-faint)]">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-[10.5px] text-[var(--color-text-faint)]">
              <span>{filtered.length} shortcuts</span>
              <span>
                Press <KeyCap>?</KeyCap> anytime
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-[10px] font-mono text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}
