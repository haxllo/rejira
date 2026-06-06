"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { USERS, type Issue } from "@/lib/mock";
import { useIssues } from "@/lib/state/issues";
import { getStatusLabel } from "@/components/primitives/status";
import { Avatar } from "@/components/primitives/avatar";
import { LabelChip } from "@/components/primitives/label";
import { SearchIcon, CircleAlertIcon } from "@/components/icons";
import { useUI } from "@/lib/state/ui";
import { cn } from "@/lib/utils";

type Facet = "all" | "issues" | "projects" | "people" | "comments";

export default function SearchPage() {
  const [q, setQ] = React.useState("");
  const [facet, setFacet] = React.useState<Facet>("all");
  const openDrawer = useUI((s) => s.openDrawer);

  React.useEffect(() => {
    const id = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('input[type="text"][placeholder^="Search…"]');
      el?.focus();
    }, 60);
    return () => clearTimeout(id);
  }, []);

  const allIssues = useIssues((s) => s.issues);

  const results = React.useMemo(() => {
    if (!q.trim()) return [] as Issue[];
    const needle = q.toLowerCase();
    return allIssues.filter(
      (i) =>
        i.title.toLowerCase().includes(needle) ||
        i.key.toLowerCase().includes(needle) ||
        i.description.toLowerCase().includes(needle),
    ).slice(0, 30);
  }, [q]);

  const people = React.useMemo(() => {
    if (!q.trim()) return [] as typeof USERS;
    const needle = q.toLowerCase();
    return USERS.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));
  }, [q]);

  const groups: Group[] = React.useMemo(() => {
    if (results.length === 0) return [];
    return [
      { id: "issues", label: "Issues", count: results.length, issues: results },
    ];
  }, [results]);

  const counts = {
    all: results.length + people.length,
    issues: results.length,
    projects: 0,
    people: people.length,
    comments: 0,
  };

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Search"
        description="Find issues, people, projects, and comments across your workspace."
        count={counts.all}
        primary={
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search… (try 'drawer', 'Aria', or 'ENG-10')"
                className="h-7 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] pl-7 pr-2 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-border-strong)] focus:outline-none"
              />
            </div>
          </div>
        }
      />

      <div className="flex flex-1 min-h-0">
        <aside className="hidden w-[200px] shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-3 lg:flex">
          <div className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            Filter results
          </div>
          {(["all", "issues", "projects", "people", "comments"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFacet(f)}
              className={cn(
                "flex h-6 items-center justify-between rounded px-2 text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-1)]",
                facet === f && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
              )}
            >
              <span className="capitalize">{f}</span>
              <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{counts[f]}</span>
            </button>
          ))}

          <div className="mt-4 px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            Tips
          </div>
          <ul className="px-2 text-[11px] leading-[1.6] text-[var(--color-text-faint)]">
            <li>Use <Kbd>⌘</Kbd> <Kbd>K</Kbd> to search anywhere</li>
            <li>Prefix with <Kbd>is:</Kbd> to filter (open, urgent)</li>
            <li>Prefix with <Kbd>by:</Kbd> for author</li>
          </ul>
        </aside>

        <div className="flex-1 overflow-y-auto">
          {!q.trim() ? (
            <EmptyState />
          ) : groups.length === 0 && people.length === 0 ? (
            <NoResults q={q} />
          ) : (
            <div>
              {(facet === "all" || facet === "people") && people.length > 0 && (
                <section className="border-b border-[var(--color-border)] px-6 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
                    <span>People</span>
                    <span className="font-mono text-[10px] text-[var(--color-text-faint)]">{people.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {people.map((u) => (
                      <div key={u.id} className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] py-0.5 pl-0.5 pr-2.5">
                        <Avatar name={u.name} size="sm" status={u.status} />
                        <div className="flex flex-col">
                          <span className="text-[12px] font-medium text-[var(--color-text)]">{u.name}</span>
                          <span className="text-[10.5px] text-[var(--color-text-faint)]">{u.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(facet === "all" || facet === "issues") && groups.length > 0 && (
                <GroupedList groups={groups} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <SearchIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">Search across everything</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">Find issues, people, projects, and comments. Start typing above.</p>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <CircleAlertIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">No matches for "{q}"</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">Try a shorter query, or check your spelling.</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1 text-[9.5px] font-mono text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}
