// Phase 3 — Stream 3I: Current user hook.
//
// Reads the real user from Better Auth's session, falling back to
// the first mock user for demo/unauthenticated mode.

"use client";

import { useSession } from "@/lib/auth/client";
import { USERS } from "@/lib/mock";

export function useCurrentUserId(): string {
  const { data: session } = useSession();
  if (session?.user?.id) return session.user.id as string;
  // Fallback for demo mode: return Aria's mock ID
  return USERS[0]?.id ?? "u_aria";
}

export function useCurrentUser() {
  const userId = useCurrentUserId();
  return USERS.find((u) => u.id === userId) ?? USERS[0];
}
