"use client";

import { useGlobalKeyboard } from "@/lib/state/keyboard";

export function GlobalShortcuts() {
  useGlobalKeyboard();
  return null;
}
