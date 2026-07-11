'use client';

import { motion } from 'motion/react';
import { fadeUp } from '@/lib/motion/variants';

interface AuthSplitShellProps {
  children: React.ReactNode;
  brandMark?: React.ReactNode;
}

export function AuthSplitShell({ children, brandMark }: AuthSplitShellProps) {
  return (
    <div className="auth-split">
      <div className="auth-split-frame">
        <div className="auth-split-row">
          <img
            className="auth-split-image"
            src="/auth-hero.svg"
            alt="rejira product preview"
            width={708}
            height={1088}
            draggable={false}
          />

          <div className="auth-split-panel">
            <header className="auth-split-brand">
              <span className="auth-split-wordmark">
                {brandMark ?? <span className="auth-split-mark" aria-hidden="true">r</span>}
                rejira
              </span>
            </header>

            <motion.main
              className="auth-split-form"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              {children}
            </motion.main>

            <nav className="auth-split-foot" aria-label="Auth footer">
              <a href="/help">Help</a>
              <span className="auth-split-foot-sep" aria-hidden="true">/</span>
              <a href="/terms">Terms</a>
              <span className="auth-split-foot-sep" aria-hidden="true">/</span>
              <a href="/privacy">privacy</a>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
