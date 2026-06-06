"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleDotIcon, SparklesIcon, CommandIcon, CheckIcon } from "@/components/icons";
import { useUI, type Density } from "@/lib/state/ui";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DENSITY_ORDER: Density[] = ["compact", "default", "roomy"];
const DENSITY_LABEL: Record<Density, string> = {
  compact: "Compact",
  default: "Default",
  roomy: "Roomy",
};

export function StatusBar() {
  const density = useUI((s) => s.density);
  const setDensity = useUI((s) => s.setDensity);
  const [time, setTime] = React.useState("");
  const [flash, setFlash] = React.useState<Density | null>(null);
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const lastShiftFlashRef = React.useRef(0);

  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  // Hydrate density from URL on mount
  React.useEffect(() => {
    const d = search.get("density");
    if (d === "compact" || d === "default" || d === "roomy") {
      if (d !== useUI.getState().density) {
        useUI.getState().setDensity(d);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist density → URL
  const writeUrl = React.useCallback(
    (next: Density) => {
      const params = new URLSearchParams(search.toString());
      if (next === "default") params.delete("density");
      else params.set("density", next);
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [search, router, pathname],
  );

  const handleSet = (next: Density) => {
    setDensity(next);
    writeUrl(next);
    setMenuOpen(false);
    setFlash(next);
    setTimeout(() => setFlash(null), 700);
  };

  // Listen for Shift+D outside of fields
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "d") {
        if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
        const sinceLast = Date.now() - lastShiftFlashRef.current;
        if (sinceLast < 250) return;
        lastShiftFlashRef.current = Date.now();
        const i = DENSITY_ORDER.indexOf(useUI.getState().density);
        const next = DENSITY_ORDER[(i + 1) % DENSITY_ORDER.length]!;
        handleSet(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeUrl]);

  // Click-outside for the density menu
  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <footer className="relative flex h-6 items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 px-3 text-[10.5px] text-[var(--color-text-faint)]">
      {/* First-paint flash overlay on density change */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={flash}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 z-10 bg-[var(--color-accent-soft)]"
          />
        )}
      </AnimatePresence>

      <div className="relative z-20 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <CircleDotIcon size={8} className="text-[var(--color-success)]" />
          Connected
        </span>
        <span className="text-[var(--color-text-faint)]">·</span>
        <span>main · 2 minutes ago</span>
        <span className="text-[var(--color-text-faint)]">·</span>
        <span>Cycle 23 · 62%</span>
      </div>
      <div className="relative z-20 flex items-center gap-3">
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMenuOpen(true);
                // Focus the active item on next tick
                setTimeout(() => {
                  const root = menuRef.current?.querySelector<HTMLUListElement>("[data-density-menu]");
                  const active = root?.querySelector<HTMLButtonElement>("[data-active='true']");
                  (active ?? root?.querySelector<HTMLButtonElement>("button"))?.focus();
                }, 0);
              }
            }}
            className={cn(
              "flex h-5 items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 transition-colors",
              menuOpen
                ? "border-[var(--color-border-strong)] text-[var(--color-text)]"
                : "text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]",
              flash && "border-[var(--color-accent)] text-[var(--color-text)]",
            )}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Density: ${DENSITY_LABEL[density]}. Click to change.`}
          >
            <span className="font-medium tracking-wide uppercase text-[9.5px]">
              {DENSITY_LABEL[density]}
            </span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.ul
                data-density-menu
                role="menu"
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute bottom-[calc(100%+6px)] right-0 z-50 w-36 overflow-hidden rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] p-1 shadow-[var(--shadow-popover)]"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    const root = e.currentTarget;
                    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button[data-menu-item]"));
                    const idx = buttons.findIndex((b) => b === document.activeElement);
                    const next = e.key === "ArrowDown"
                      ? (idx + 1) % buttons.length
                      : (idx - 1 + buttons.length) % buttons.length;
                    buttons[next]?.focus();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setMenuOpen(false);
                  }
                }}
              >
                {DENSITY_ORDER.map((d) => (
                  <li key={d} role="none">
                    <button
                      role="menuitemradio"
                      aria-checked={density === d}
                      data-menu-item
                      data-active={density === d}
                      onClick={() => handleSet(d)}
                      className={cn(
                        "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11.5px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)] focus:bg-[var(--color-surface-2)] focus:text-[var(--color-text)] focus:outline-none",
                        density === d && "text-[var(--color-text)]",
                      )}
                    >
                      <span>{DENSITY_LABEL[d]}</span>
                      {density === d && <CheckIcon size={11} className="text-[var(--color-accent)]" />}
                    </button>
                  </li>
                ))}
                <li className="mt-1 border-t border-[var(--color-border)] px-2 py-1.5 text-[9.5px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
                  ⇧ D to cycle
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <span className="flex items-center gap-1">
          <CommandIcon size={10} />
          K
        </span>
        <span>{time}</span>
        <span className="flex items-center gap-1">
          <SparklesIcon size={10} className="text-[var(--color-accent)]" />
          AI ready
        </span>
      </div>
    </footer>
  );
}
