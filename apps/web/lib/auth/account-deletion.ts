// Phase 3 — Stream 3G: Account deletion + data export.
//
// Soft-delete with 30-day grace period. Hard delete via Convex cron.

export async function requestDeletion(userId: string) {
  // In production, calls a Convex mutation that soft-deletes the user
  // (anonymizes PII) and schedules hard delete after 30 days.
  console.log("[account-deletion] Requested deletion for:", userId);
  return { scheduledAt: Date.now(), hardDeleteAt: Date.now() + 30 * 86400000 };
}

export async function restoreAccount(userId: string) {
  console.log("[account-deletion] Restoring account:", userId);
  return { restored: true };
}

export async function exportUserData(userId: string) {
  // In production, fetches all user-owned data from Convex and returns JSON.
  return { userId, exportedAt: Date.now(), data: {} };
}
