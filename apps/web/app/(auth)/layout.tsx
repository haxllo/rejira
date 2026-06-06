// Phase 3 — Refined auth layout matching the app's design system.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Sign In — Rejira", template: "%s — Rejira" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] p-6">
      {/* Ambient glow behind the card — subtle depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px] space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 shadow-[var(--shadow-2)]">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-fg)]">
            R
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
            rejira
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
