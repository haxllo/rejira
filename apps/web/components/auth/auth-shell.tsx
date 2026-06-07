'use client';

import { motion } from 'motion/react';
import { fadeUp } from '@/lib/motion/variants';

interface AuthShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AuthShell({ children, title }: AuthShellProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--color-accent)]/5 blur-3xl" />
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[400px] space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-8 shadow-[var(--shadow-2)]"
      >
        <div className="flex items-center gap-3 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)] text-xs font-bold text-[var(--color-accent-fg)]">
            R
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
            rejira
          </span>
        </div>

        {title && (
          <h1 className="auth-title">{title}</h1>
        )}

        {children}
      </motion.div>
    </div>
  );
}
