"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "motion/react";

import {
  SearchIcon,
  HashIcon,
  InboxIcon,
  ListIconCustom,
  RowsIcon,
  KanbanIconCustom,
  HomeIcon,
  GanttIcon,
  PlusIcon,
  SparklesIcon,
  CircleDotIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/icons";
import { useShallow } from "zustand/react/shallow";
import { useUI } from "@/lib/state/ui";
import { useProjectsStore } from "@/lib/state/projects";
import { StatusDot } from "@/components/primitives/status";
import { PriorityIcon } from "@/components/primitives/priority";
import { Avatar } from "@/components/primitives/avatar";
import { LabelDot } from "@/components/primitives/label";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchMode } from "@/lib/search/types";

export function CommandPalette() {
  const router = useRouter();
  const open = useUI((s) => s.commandOpen);
  const setOpen = useUI((s) => s.setCommandOpen);
  const openDrawer = useUI((s) => s.openDrawer);
  const projectList = useProjectsStore(useShallow((s) => Object.values(s.byId)));

  const [searchText, setSearchText] = React.useState("");
  const [searchMode, setSearchMode] = React.useState<SearchMode>("hybrid");
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          text: searchText,
          mode: searchMode,
          limit: "20",
        });
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [searchText, searchMode]);

  const hasAIKey = true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--color-overlay)] pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[640px] overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-[var(--shadow-popover)]"
          >
            <Command
              label="Global command menu"
              className="flex flex-col"
              shouldFilter={false}
              loop
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
                <SearchIcon size={16} className="text-[var(--color-text-faint)]" />

                {hasAIKey && (
                  <button
                    onClick={() => setSearchMode(searchMode === "hybrid" ? "semantic" : "hybrid")}
                    className={cn(
                      "flex h-5 items-center rounded px-1.5 text-[10px] font-medium transition-colors",
                      searchMode === "semantic"
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
                    )}
                  >
                    {searchMode === "semantic" ? "AI" : "⌘"}
                  </button>
                )}

                <Command.Input
                  autoFocus
                  value={searchText}
                  onValueChange={setSearchText}
                  placeholder="Type a command, search, or ask AI…"
                  className="h-12 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
                />
                {searchLoading && (
                  <div className="size-3 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-accent)]" />
                )}
              </div>

              <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
                {searchText.trim() && searchResults.length === 0 && !searchLoading && (
                  <Command.Empty className="px-3 py-8 text-center text-[12.5px] text-[var(--color-text-faint)]">
                    No results. Press Enter to create an issue with this title.
                  </Command.Empty>
                )}

                {!searchText.trim() && (
                  <>
                    <Command.Group
                      heading="Jump to"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                    >
                      <Item
                        icon={<InboxIcon size={14} />}
                        label="Inbox"
                        sub="Notifications and assignments"
                        onSelect={() => { router.push("/inbox"); setOpen(false); }}
                      />
                      <Item
                        icon={<ListIconCustom size={14} />}
                        label="My Issues"
                        sub="Issues assigned to you"
                        onSelect={() => { router.push("/my-issues"); setOpen(false); }}
                      />
                      <Item
                        icon={<HomeIcon size={14} />}
                        label="Home"
                        sub="Workspace overview"
                        onSelect={() => { router.push("/"); setOpen(false); }}
                      />
                    </Command.Group>

                    <Command.Group
                      heading="Views"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                    >
                      <Item
                        icon={<RowsIcon size={14} />}
                        label="Engineering — All Issues"
                        sub="ENG"
                        onSelect={() => { router.push("/projects/eng/issues"); setOpen(false); }}
                      />
                      <Item
                        icon={<KanbanIconCustom size={14} />}
                        label="Cycle 23 — Realtime foundations"
                        sub="ENG · 2 days left"
                        onSelect={() => { router.push("/projects/eng/cycles/23"); setOpen(false); }}
                      />
                      <Item
                        icon={<GanttIcon size={14} />}
                        label="Engineering — Roadmap"
                        sub="Timeline view"
                        onSelect={() => { router.push("/projects/eng/roadmap"); setOpen(false); }}
                      />
                    </Command.Group>

                    <Command.Group
                      heading="Projects"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                    >
                      {projectList.map((p) => (
                        <Item
                          key={p.id}
                          icon={
                            <span
                              className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                              style={{ background: p.iconColor ?? 'var(--color-text-faint)' }}
                            >
                              {(p.iconLetter ?? p.name.slice(0, 1)).toUpperCase()}
                            </span>
                          }
                          label={p.name}
                          sub={p.description}
                          onSelect={() => {
                            router.push(`/projects/${p.key.toLowerCase()}/issues`);
                            setOpen(false);
                          }}
                        />
                      ))}
                    </Command.Group>

                    <Command.Group
                      heading="Actions"
                      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                    >
                      <Item
                        icon={<PlusIcon size={14} />}
                        label="Create new issue"
                        sub="⌘ N"
                        onSelect={() => setOpen(false)}
                      />
                      <Item
                        icon={<SparklesIcon size={14} />}
                        label="Ask AI: summarize cycle progress"
                        sub="⌘ ⇧ A"
                        onSelect={() => setOpen(false)}
                      />
                      <Item
                        icon={<UserIcon size={14} />}
                        label="Invite teammate"
                        onSelect={() => setOpen(false)}
                      />
                      <Item
                        icon={<SettingsIcon size={14} />}
                        label="Workspace settings"
                        onSelect={() => setOpen(false)}
                      />
                    </Command.Group>
                  </>
                )}

                {searchResults.length > 0 && (
                  <Command.Group
                    heading={`Search Results (${searchResults.length})`}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                  >
                    {searchResults.map((result) => (
                      <Item
                        key={result.id}
                        icon={
                          <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">
                            {result.projectKey}
                          </span>
                        }
                        label={
                          <span>
                            {result.matchHighlights.length > 0
                              ? result.matchHighlights[0]
                              : result.title}
                          </span>
                        }
                        sub={
                          <span className="flex items-center gap-2">
                            <StatusDot status={result.status as any} size={6} />
                            <PriorityIcon priority={result.priority as any} size={10} />
                            {result.matchType === "semantic" && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-accent)]">
                                <SparklesIcon size={9} /> AI
                              </span>
                            )}
                            {result.assigneeName && (
                              <Avatar name={result.assigneeName} size="xs" />
                            )}
                          </span>
                        }
                        onSelect={() => {
                          openDrawer(result.id);
                          setOpen(false);
                        }}
                      />
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-1.5 text-[10.5px] text-[var(--color-text-faint)]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <KbdInline>↑</KbdInline>
                    <KbdInline>↓</KbdInline>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <KbdInline>↵</KbdInline> select
                  </span>
                  <span className="flex items-center gap-1">
                    <KbdInline>esc</KbdInline> close
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CircleDotIcon size={9} className="text-[var(--color-success)]" />
                  <span>Search</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Item({
  icon,
  label,
  sub,
  onSelect,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  sub?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${typeof label === "string" ? label : ""}`}
      onSelect={onSelect}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-3 rounded-md px-2 text-[12.5px] text-[var(--color-text-muted)]",
        "data-[selected=true]:bg-[var(--color-surface-2)] data-[selected=true]:text-[var(--color-text)]",
        "outline-none",
      )}
    >
      <span className="grid size-5 place-items-center text-[var(--color-text-faint)]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {sub && <span className="text-[11px] text-[var(--color-text-faint)]">{sub}</span>}
    </Command.Item>
  );
}

function KbdInline({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded border border-[var(--color-border-strong)] bg-[var(--color-surface-2)] px-1 text-[9px] font-medium text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}
