// Phase 4 — RBAC helpers for Convex mutations.
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export type Permission = "view" | "edit" | "archive" | "invite" | "manage";

export function can(role: string, action: Permission): boolean {
  switch (action) {
    case "view": return true;
    case "edit": return role === "owner" || role === "admin" || role === "member";
    case "archive": return role === "owner" || role === "admin";
    case "invite": return role === "owner" || role === "admin";
    case "manage": return role === "owner";
  }
}
