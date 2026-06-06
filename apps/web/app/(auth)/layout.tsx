// Phase 3 — Stream 3B: Auth layout.
//
// Centered, dark, branded shell for sign-in, sign-up, and all auth pages.
// Unauthenticated users see this; the main app layout is behind RequireAuth (3I).

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Sign In — Rejira", template: "%s — Rejira" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo" />
        {children}
      </div>
    </div>
  );
}
