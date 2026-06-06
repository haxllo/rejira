"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUI } from "@/lib/state/ui";

/** Mounts a route-change listener that clears the multi-select set.
 *  Selection is per-page (not in the URL) and must not bleed across routes. */
export function RouteChangeSelectionReset() {
  const pathname = usePathname();
  useEffect(() => {
    useUI.getState().clearSelected();
  }, [pathname]);
  return null;
}
