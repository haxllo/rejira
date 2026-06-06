// Phase 3 — Stream 3D: Two-factor setup page.

"use client";

import { TwoFactorSetup } from "@/components/auth/two-factor-setup";

export default function TwoFactorSetupPage() {
  return (
    <>
      <h1 className="auth-title">Set up two-factor authentication</h1>
      <p className="auth-description">
        Scan the QR code with your authenticator app (Google Authenticator, 1Password, etc.).
      </p>
      <TwoFactorSetup onDone={() => { window.location.href = "/two-factor/backup-codes"; }} />
    </>
  );
}
