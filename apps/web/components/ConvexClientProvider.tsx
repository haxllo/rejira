// Phase 4 — Convex client provider.
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://beloved-tapir-68.convex.cloud";
const client = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
