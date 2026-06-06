"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  EMPTY_FILTER,
  parseFilter,
  parseViewParams,
  serializeFilter,
  serializeViewParams,
  type FilterState,
  type GroupBy,
  type SortKey,
  type SortDir,
} from "@/lib/state/view-query";

/**
 * Bind a view's filter + group + sort state to the URL.
 * The URL is the source of truth. The returned `setState` is the only
 * sanctioned way to mutate it.
 */
export function useViewQuery(viewId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [filter, setFilterState] = useState<FilterState>(() => parseFilter(search, viewId));
  const [view, setViewState] = useState(() => parseViewParams(search));
  const debounceRef = useRef<number | null>(null);

  // Mirror state into a ref so setters can read the latest values outside
  // of an event handler without going stale. Updated on every render; pure
  // assignment, no re-render.
  const stateRef = useRef({ filter, view });
  stateRef.current = { filter, view };

  // Re-sync from URL when it changes externally (back/forward navigation)
  useEffect(() => {
    setFilterState(parseFilter(search, viewId));
    setViewState(parseViewParams(search));
    // We intentionally only react to `search` (a stable URLSearchParams instance
    // from Next) so we don't loop on our own setSearch calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const writeUrl = useCallback(
    (next: { filter: FilterState; view: { group: GroupBy; sortKey: SortKey; sortDir: SortDir } }) => {
      const merged = new URLSearchParams();
      const f = serializeFilter(next.filter);
      const v = serializeViewParams(next.view.group, next.view.sortKey, next.view.sortDir);
      const density = search.get("density");
      f.forEach((val, key) => merged.set(key, val));
      v.forEach((val, key) => merged.set(key, val));
      if (density) merged.set("density", density);
      const qs = merged.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, search],
  );

  const setFilter = useCallback(
    (updater: (prev: FilterState) => FilterState) => {
      const current = stateRef.current;
      const next = updater(current.filter);
      setFilterState(next);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        writeUrl({ filter: next, view: current.view });
      }, next.search ? 200 : 0);
    },
    [writeUrl],
  );

  const setGroup = useCallback(
    (group: GroupBy) => {
      const current = stateRef.current;
      const newView = { ...current.view, group };
      setViewState(newView);
      writeUrl({ filter: current.filter, view: newView });
    },
    [writeUrl],
  );

  const setSort = useCallback(
    (sortKey: SortKey, sortDir?: SortDir) => {
      const current = stateRef.current;
      const newView = { ...current.view, sortKey, sortDir: sortDir ?? current.view.sortDir };
      setViewState(newView);
      writeUrl({ filter: current.filter, view: newView });
    },
    [writeUrl],
  );

  const clear = useCallback(() => {
    const current = stateRef.current;
    setFilterState(EMPTY_FILTER);
    writeUrl({ filter: EMPTY_FILTER, view: current.view });
  }, [writeUrl]);

  return {
    filter,
    setFilter,
    group: view.group,
    setGroup,
    sortKey: view.sortKey,
    sortDir: view.sortDir,
    setSort,
    clear,
  };
}
