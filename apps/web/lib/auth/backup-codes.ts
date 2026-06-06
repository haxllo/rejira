// Phase 3 — Stream 3D: Backup codes generation and verification.
//
// Better Auth manages backup codes through its twoFactor plugin.
// This module provides helpers for the UI to display and use them.

import { twoFactorApi } from "./two-factor";

export async function generateBackupCodes(password: string) {
  return twoFactorApi.generateBackupCodes({ password });
}

export async function getBackupCodes() {
  return (twoFactorApi as any).viewBackupCodes();
}

export async function verifyBackupCode(code: string) {
  return twoFactorApi.verifyBackupCode({ code });
}
