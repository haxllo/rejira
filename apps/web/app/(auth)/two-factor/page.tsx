// Phase 3 — Stream 3D: Two-factor challenge page.

"use client";

import { TwoFactorForm } from "@/components/auth/two-factor-form";

export default function TwoFactorPage() {
  return (
    <>
      <h1 className="auth-title">Two-factor authentication</h1>
      <p className="auth-description">
        Enter the 6-digit code from your authenticator app, or use a backup code.
      </p>
      <TwoFactorForm onSuccess={() => { window.location.href = "/inbox"; }} />
      <p className="auth-footer">
        Lost access? Use a <a href="/two-factor/backup-codes">backup code</a>.
      </p>
    </>
  );
}
