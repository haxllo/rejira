"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, CircleAlertIcon } from "@/components/icons";
import { bindToastHost, type MutationContext, type ToastVariant } from "@/lib/state/mutations";

type Toast = {
  id: number;
  message: string;
  detail?: string;
  variant: ToastVariant;
  durationMs: number;
  createdAt: number;
  /** Handler called when the toast body is clicked (usually = undo). */
  onAction: () => void;
  /** Optional secondary "view" / "open" action. */
  viewAction?: { label: string; run: () => void };
  /** Optional retry for failed mutations. */
  onRetry?: () => void;
};

let counter = 0;

/** Public surface for legacy `jira:toast` CustomEvent listeners. */
export function showToast(t: { message: string; actionLabel?: string; action?: () => void; detail?: string }) {
  pushToast({
    id: ++counter,
    message: t.message,
    detail: t.detail,
    variant: "info",
    durationMs: 4000,
    createdAt: Date.now(),
    onAction: t.action ?? (() => {}),
  });
}

const TOAST_LIMIT = 3;
const stack: Toast[] = [];
let pushFn: ((t: Toast) => void) | null = null;

function pushToast(t: Toast): void {
  if (stack.length >= TOAST_LIMIT) {
    // Collapse oldest into "+ N more"
    const collapsed = stack.shift()!;
    stack.push({ ...collapsed, message: collapsed.message, detail: `+ ${stack.length + 1} older` } as Toast);
  }
  stack.push(t);
  pushFn?.(t);
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pushFn = (t) => {
      setToasts((prev) => {
        const next = [...prev, t];
        return next.length > TOAST_LIMIT ? next.slice(next.length - TOAST_LIMIT) : next;
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
        const i = stack.findIndex((x) => x.id === t.id);
        if (i >= 0) stack.splice(i, 1);
      }, t.durationMs);
    };
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.message) return;
      pushToast({
        id: ++counter,
        message: detail.message,
        detail: detail.detail,
        variant: detail.variant ?? (detail.action ? "success" : "info"),
        durationMs: 5000,
        createdAt: Date.now(),
        onAction: detail.action ?? (() => {}),
        viewAction: detail.viewAction,
        onRetry: detail.onRetry,
      });
    };
    const unbind = bindToastHost((ctx: MutationContext) => {
      pushToast({
        id: ++counter,
        message: ctx.message,
        detail: ctx.detail,
        variant: ctx.variant ?? "success",
        durationMs: 5000,
        createdAt: Date.now(),
        onAction: ctx.undo,
        viewAction: ctx.viewAction,
        onRetry: ctx.retry,
      });
    });
    window.addEventListener("jira:toast", onToast);
    return () => {
      pushFn = null;
      unbind();
      window.removeEventListener("jira:toast", onToast);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            toast={t}
            onDismiss={() => {
              setToasts((prev) => prev.filter((x) => x.id !== t.id));
              const i = stack.findIndex((x) => x.id === t.id);
              if (i >= 0) stack.splice(i, 1);
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(1);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (pausedRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - start;
      const remaining = Math.max(0, 1 - elapsed / t.durationMs);
      setProgress(remaining);
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t.durationMs]);

  return (
    <motion.div
      layout
      initial={{ y: 16, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 8, opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onClick={() => {
        t.onAction();
        onDismiss();
      }}
      className="pointer-events-auto relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/95 pr-3 shadow-[var(--shadow-lg)] backdrop-blur"
    >
      {/* Progress ring on the left edge */}
      <ProgressRing progress={progress} variant={t.variant} />
      <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-success)]/16 text-[var(--color-success)]">
        {t.variant === "error" ? <CircleAlertIcon size={12} /> : <CheckIcon size={12} />}
      </span>
      <span className="text-[12.5px] text-[var(--color-text)]">{t.message}</span>
      {t.detail && (
        <span className="text-[11px] text-[var(--color-text-faint)]">{t.detail}</span>
      )}
      {t.onRetry && t.variant === "error" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            t.onRetry!();
            onDismiss();
          }}
          className="rounded-full border border-[var(--color-danger)]/40 px-2 py-0.5 text-[11px] font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
        >
          Retry
        </button>
      )}
      {t.variant !== "error" && (
        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium text-[var(--color-accent)] group-hover:bg-[var(--color-accent-soft)]">
          <UndoGlyph size={11} />
          Undo
        </span>
      )}
      {t.viewAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            t.viewAction!.run();
            onDismiss();
          }}
          className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
        >
          {t.viewAction.label}
        </button>
      )}
    </motion.div>
  );
}

function UndoGlyph({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3 8a5 5 0 1 0 1.464-3.536L3 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 3v3h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressRing({ progress, variant }: { progress: number; variant: ToastVariant }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  const color =
    variant === "error"
      ? "var(--color-danger)"
      : variant === "info"
        ? "var(--color-text-faint)"
        : "var(--color-accent)";
  return (
    <span className="ml-2 grid size-5 shrink-0 place-items-center">
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle cx="10" cy="10" r={r} stroke="var(--color-border)" strokeWidth="2" fill="none" />
        <circle
          cx="10"
          cy="10"
          r={r}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 60ms linear" }}
        />
      </svg>
    </span>
  );
}
