// Phase 3 — Stream 3E: Invite helpers for the web layer.

import { authClient } from "./client";

export async function sendInvite(workspaceId: string, email: string, role: string) {
  const client = authClient;
  // Calls the Convex mutation via fetch — in 3I this will use authenticated queries.
  const res = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/function`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "memberships:invite",
      format: "convex_encoded_json",
      args: [{ workspaceId, email, role }],
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.message ?? "Failed to send invitation");
  }
  return res.json();
}
