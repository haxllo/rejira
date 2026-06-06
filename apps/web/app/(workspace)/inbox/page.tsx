"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { FilterChips } from "@/components/views/filter-chips";
import { GroupedList, type Group } from "@/components/views/grouped-list";
import { INBOX, inboxFor, userById, type InboxItem } from "@/lib/mock";
import { useUI } from "@/lib/state/ui";
import { Avatar } from "@/components/primitives/avatar";
import { relativeTime } from "@/lib/utils/date";
import { CheckIcon, ArrowUpRightIcon, AtSignIcon } from "@/components/icons";

export default function InboxPage() {
  const [tab, setTab] = React.useState<"all" | "unread" | "mentions">("all");
  const openDrawer = useUI((s) => s.openDrawer);

  const items = React.useMemo(() => {
    let list = INBOX;
    if (tab === "unread") list = list.filter((i) => !i.read);
    if (tab === "mentions") list = list.filter((i) => i.type === "mention");
    return list;
  }, [tab]);

  const groups: Group[] = React.useMemo(() => {
    const today: InboxItem[] = [];
    const yesterday: InboxItem[] = [];
    const week: InboxItem[] = [];
    const now = Date.now();
    const dayMs = 86400000;

    for (const it of items) {
      const t = new Date(it.createdAt).getTime();
      const age = now - t;
      if (age < dayMs) today.push(it);
      else if (age < 2 * dayMs) yesterday.push(it);
      else if (age < 7 * dayMs) week.push(it);
      else week.push(it);
    }
    return [
      { id: "today", label: "Today", count: today.length, issues: today as any },
      { id: "yesterday", label: "Yesterday", count: yesterday.length, issues: yesterday as any },
      { id: "week", label: "This week", count: week.length, issues: week as any },
    ].filter((g) => g.issues.length > 0);
  }, [items]);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Inbox"
        description="Notifications across all projects — never miss a thing."
        count={INBOX.filter((i) => !i.read).length}
        primary={
          <div className="flex h-7 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-0.5">
            {(["all", "unread", "mentions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative h-6 rounded px-2.5 text-[11.5px] font-medium capitalize text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] data-[active=true]:text-[var(--color-text)]"
                data-active={tab === t}
              >
                {tab === t && (
                  <motion.div
                    layoutId="inbox-tab"
                    className="absolute inset-0 rounded bg-[var(--color-surface-3)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {t}
                  {t === "unread" && INBOX.filter((i) => !i.read).length > 0 && (
                    <span className="ml-1.5 font-mono text-[10px] text-[var(--color-accent)]">
                      {INBOX.filter((i) => !i.read).length}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col">
            {groups.map((g) => (
              <section key={g.id} className="border-b border-[var(--color-border)]">
                <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-[var(--color-bg)]/95 px-6 py-1.5 backdrop-blur">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {g.label}
                  </span>
                  <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{g.count}</span>
                </div>
                <ul className="flex flex-col">
                  {g.issues.map((it: any, i: number) => (
                    <InboxRow key={it.id} item={it} index={i} onOpen={() => openDrawer(it.issueId)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxRow({ item, index, onOpen }: { item: InboxItem; index: number; onOpen: () => void }) {
  const issue = inboxFor(item.issueId);
  const actor = item.actorId ? userById(item.actorId) : null;
  const actorName = actor?.name ?? "rejira";
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.18), type: "spring", stiffness: 320, damping: 28 }}
      className="group"
    >
      <button
        onClick={onOpen}
        className="flex w-full items-start gap-3 px-6 py-2.5 text-left hover:bg-[var(--color-surface-1)]"
      >
        {!item.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />}
        {item.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent" />}
        <Avatar name={actorName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[12.5px] leading-[1.5]">
            {item.type !== "due" && (
              <span className="shrink-0 font-medium text-[var(--color-text)]">{actorName}</span>
            )}
            <span className="shrink-0 text-[var(--color-text-muted)]"><InboxVerb type={item.type} /></span>
            {issue && (
              <>
                <span className="shrink-0 font-mono text-[10.5px] text-[var(--color-text-faint)]">{issue.key}</span>
                <span className="min-w-0 truncate text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">— {issue.title}</span>
              </>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-faint)]">
            <span>{relativeTime(item.createdAt)}</span>
            {item.preview && (
              <>
                <span>·</span>
                <span className="truncate italic">"{item.preview}"</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <span className="text-[var(--color-text-faint)] opacity-0 transition-opacity group-hover:opacity-100">
            <ArrowUpRightIcon size={11} />
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function InboxVerb({ type }: { type: InboxItem["type"] }) {
  switch (type) {
    case "assignment":
      return <span className="text-[var(--color-text-muted)]">assigned you to</span>;
    case "mention":
      return (
        <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
          mentioned you on <AtSignIcon size={10} />
        </span>
      );
    case "review_request":
      return <span className="text-[var(--color-text-muted)]">requested your review on</span>;
    case "status_change":
      return <span className="text-[var(--color-text-muted)]">changed status of</span>;
    case "comment":
      return <span className="text-[var(--color-text-muted)]">commented on</span>;
    case "due":
      return <span className="text-[var(--color-danger)]">is overdue on</span>;
    default:
      return <span className="text-[var(--color-text-muted)]">updated</span>;
  }
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-accent)]">
        <CheckIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">You're all caught up</h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">No new notifications — your inbox is empty.</p>
    </div>
  );
}
