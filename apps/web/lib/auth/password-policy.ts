// Phase 3 — Stream 3G: Password policy.
//
// Enforces minimum strength requirements. Expands in 3G with
// HaveIBeenPwned k-anonymity check.

const COMMON = new Set([
  "password", "password123", "12345678", "qwerty123",
  "letmein12", "adminadmin", "welcome12", "monkey123",
]);

export function validatePassword(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password))
    return "Password must contain letters";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (COMMON.has(password.toLowerCase())) return "This password is too common";
  return null;
}

export function checkBreach(password: string): Promise<boolean> {
  // 3K: Add HaveIBeenPwned k-anonymity check
  // SHA-1 hash prefix → check against HIBP API
  return Promise.resolve(false);
}
