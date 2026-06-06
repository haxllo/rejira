// Phase 3 — Stream 3D: Two-factor authentication helpers.
//
// Thin wrappers around Better Auth's twoFactor API.
// The actual TOTP logic lives in Better Auth's twoFactor plugin.

import { authClient } from "./client";

export const twoFactorApi = authClient.twoFactor;

export async function enableTwoFactor(password: string) {
  return twoFactorApi.enable({ password });
}

export async function disableTwoFactor(password: string) {
  return twoFactorApi.disable({ password });
}

export async function verifyTwoFactor(code: string) {
  return twoFactorApi.verifyTotp({ code });
}
