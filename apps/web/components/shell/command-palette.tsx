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
import { ISSUES, PROJECTS, USERS, INBOX } from "@/lib/mock";
import { useUI } from "@/lib/state/ui";
import { StatusDot } from "@/components/primitives/status";
import { PriorityIcon } from "@/components/primitives/priority";
import { Avatar } from "@/components/primitives/avatar";
import { LabelDot } from "@/components/primitives/label";
import { labelById } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const open = useUI((s) => s.commandOpen);
  const setOpen = useUI((s) => s.setCommandOpen);
  const openDrawer = useUI((s) => s.openDrawer);

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
              shouldFilter
              loop
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4">
                <SearchIcon size={16} className="text-[var(--color-text-faint)]" />
                <Command.Input
                  autoFocus
                  placeholder="Type a command, search, or jump to a view…"
                  className="h-12 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
                />
                <SparklesIcon size={13} className="text-[var(--color-accent)]" />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
                <Command.Empty className="px-3 py-8 text-center text-[12.5px] text-[var(--color-text-faint)]">
                  No results. Press Enter to create an issue with this title.
                </Command.Empty>

                <Command.Group
                  heading="Jump to"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                >
                  <Item
                    icon={<InboxIcon size={14} />}
                    label="Inbox"
                    sub="Notifications and assignments"
                    onSelect={() => {
                      router.push("/inbox");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={<ListIconCustom size={14} />}
                    label="My Issues"
                    sub="Issues assigned to you"
                    onSelect={() => {
                      router.push("/my-issues");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={<HomeIcon size={14} />}
                    label="Home"
                    sub="Workspace overview"
                    onSelect={() => {
                      router.push("/");
                      setOpen(false);
                    }}
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
                    onSelect={() => {
                      router.push("/projects/eng/issues");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={<KanbanIconCustom size={14} />}
                    label="Cycle 23 — Realtime foundations"
                    sub="ENG · 2 days left"
                    onSelect={() => {
                      router.push("/projects/eng/cycles/23");
                      setOpen(false);
                    }}
                  />
                  <Item
                    icon={<GanttIcon size={14} />}
                    label="Engineering — Roadmap"
                    sub="Timeline view"
                    onSelect={() => {
                      router.push("/projects/eng/roadmap");
                      setOpen(false);
                    }}
                  />
                </Command.Group>

                <Command.Group
                  heading="Projects"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                >
                  {PROJECTS.map((p) => (
                    <Item
                      key={p.id}
                      icon={
                        <span
                          className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                          style={{ background: p.iconColor }}
                        >
                          {p.iconLetter}
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
                  heading="Issues"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-[var(--color-text-faint)]"
                >
                  {ISSUES.slice(0, 12).map((issue) => {
                    const labels = issue.labelIds
                      .map((id) => labelById(id))
                      .filter(Boolean);
                    return (
                      <Item
                        key={issue.id}
                        icon={
                          <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">
                            {issue.key}
                          </span>
                        }
                        label={issue.title}
                        sub={
                          <span className="flex items-center gap-2">
                            <StatusDot status={issue.status} size={6} />
                            <PriorityIcon priority={issue.priority} size={10} />
                            {labels.slice(0, 2).map((l) => l && <LabelDot key={l.id} name={l.name} />)}
                            {issue.assigneeIds[0] && (
                              <Avatar
                                name={USERS.find((u) => u.id === issue.assigneeIds[0])?.name ?? "?"}
                                size="xs"
                              />
                            )}
                          </span>
                        }
                        onSelect={() => {
                          openDrawer(issue.id);
                          setOpen(false);
                        }}
                      />
                    );
                  })}
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
                  <span>Synced 2s ago</span>
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
  label: string;
  sub?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${label} ${typeof sub === "string" ? sub : ""}`}
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
