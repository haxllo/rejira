"use client";

import { useEffect } from "react";
import { useSavedViews, type SavedView as ClientSavedView } from "@/lib/state/saved-views";

export function SavedViewsHydrator({ initialViews }: { initialViews: ClientSavedView[] }) {
  const setViews = useSavedViews((s) => s.setViews);
  useEffect(() => {
    setViews(initialViews);
  }, [initialViews, setViews]);
  return null;
}
