// Phase 3 — Workspace switcher. Reads `?w=` URL param.
"use client";

import { useSearchParams } from "next/navigation";

const WORKSPACES = [
  { id: "w_acme", name: "Acme", slug: "acme" },
];

export function useWorkspace() {
  const params = useSearchParams();
  const w = params.get("w") ?? "acme";
  return WORKSPACES.find((ws) => ws.slug === w) ?? WORKSPACES[0];
}

export function useWorkspaceList() {
  return WORKSPACES;
}
