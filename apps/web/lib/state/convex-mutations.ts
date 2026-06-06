// Phase 4 — Convex mutation helpers (not hooks, for use in event handlers).
// Pattern: optimistic Zustand → apply() → Convex mutation → rollback on error.

import { ConvexHttpClient } from "convex/browser";

function client() {
  return new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://beloved-tapir-68.convex.cloud",
  );
}

function call(path: string, args: any) {
  return (client() as any).function(path, undefined, args);
}

export async function convexSetStatus(issueId: string, status: string) {
  return call("issues:setStatus", { issueId, status });
}

export async function convexSetPriority(issueId: string, priority: string) {
  return call("issues:setPriority", { issueId, priority });
}

export async function convexSetTitle(issueId: string, title: string) {
  return call("issues:setTitle", { issueId, title });
}

export async function convexSetDescription(issueId: string, description: string) {
  return call("issues:setDescription", { issueId, description });
}

export async function convexCreateIssue(args: any) {
  return call("issues:create", args);
}

export async function convexBulkArchive(issueIds: string[]) {
  return call("issues:bulkArchive", { issueIds });
}
