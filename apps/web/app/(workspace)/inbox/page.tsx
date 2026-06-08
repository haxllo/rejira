import { getNotifications } from "@/lib/db/rsc";
import { db } from "@/lib/db/client";
import { users, issues } from "@/lib/db/schema";
import { InboxItem, InboxEmptyState } from "@/components/inbox/inbox-item";
import { ViewHeader } from "@/components/views/view-header";
import { inArray } from "drizzle-orm";
import type { Notification } from "@/lib/db/types";

export const dynamic = "force-dynamic";

type InboxFilter = "all" | "unread" | "mentions";

interface InboxPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { filter: rawFilter } = await searchParams;
  const filter: InboxFilter =
    rawFilter === "unread" || rawFilter === "mentions" ? rawFilter : "all";

  const unreadOnly = filter === "unread";
  const notifications = await getNotifications({ unreadOnly, limit: 100 });

  const filtered = notifications.filter((n) => {
    if (filter === "mentions") return n.type === "issue_mentioned";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const actorIds = Array.from(
    new Set(
      notifications
        .map((n) => n.userId)
        .filter((id): id is bigint => typeof id === "bigint"),
    ),
  );

  const issueIds = Array.from(
    new Set(
      notifications
        .map((n) => n.issueId)
        .filter((id): id is bigint => typeof id === "bigint"),
    ),
  );

  const actorMap = new Map<bigint, string>();
  if (actorIds.length > 0) {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const r of rows) actorMap.set(r.id, r.name);
  }

  const issueMap = new Map<bigint, { key: string; title: string; externalId: string }>();
  if (issueIds.length > 0) {
    const rows = await db
      .select({
        id: issues.id,
        externalId: issues.externalId,
        key: issues.key,
        title: issues.title,
      })
      .from(issues)
      .where(inArray(issues.id, issueIds));
    for (const r of rows) {
      issueMap.set(r.id, { key: r.key, title: r.title, externalId: r.externalId });
    }
  }

  const groups = groupByDate(filtered);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Inbox"
        description="Notifications across all projects — never miss a thing."
        count={unreadCount}
        primary={<FilterTabs current={filter} unreadCount={unreadCount} />}
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <InboxEmptyState />
        ) : (
          <div className="flex flex-col">
            {groups.map((g) => (
              <section key={g.id} className="border-b border-[var(--color-border)]">
                <div className="sticky top-0 z-[1] flex items-center gap-1.5 bg-[var(--color-bg)]/95 px-6 py-1.5 backdrop-blur">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    {g.label}
                  </span>
                  <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">
                    {g.count}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {g.items.map((notif, i) => {
                    const issue = notif.issueId !== null ? issueMap.get(notif.issueId) : null;
                    return (
                      <InboxItem
                        key={String(notif.id)}
                        notification={notif}
                        actorName={null}
                        issueKey={issue?.key ?? null}
                        issueTitle={issue?.title ?? null}
                        index={i}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTabs({ current, unreadCount }: { current: InboxFilter; unreadCount: number }) {
  const tabs: InboxFilter[] = ["all", "unread", "mentions"];
  return (
    <div className="flex h-7 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-0.5">
      {tabs.map((t) => {
        const active = t === current;
        return (
          <a
            key={t}
            href={t === "all" ? "/inbox" : `/inbox?filter=${t}`}
            data-active={active}
            className="relative grid h-6 place-items-center rounded px-2.5 text-[11.5px] font-medium capitalize text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] data-[active=true]:text-[var(--color-text)]"
          >
            {t}
            {t === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 font-mono text-[10px] text-[var(--color-accent)]">{unreadCount}</span>
            )}
          </a>
        );
      })}
    </div>
  );
}

interface NotificationGroup {
  id: string;
  label: string;
  count: number;
  items: Notification[];
}

function groupByDate(items: Notification[]): NotificationGroup[] {
  const now = Date.now();
  const day = 86_400_000;
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const week: Notification[] = [];
  const older: Notification[] = [];

  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    const age = now - t;
    if (age < day) today.push(n);
    else if (age < 2 * day) yesterday.push(n);
    else if (age < 7 * day) week.push(n);
    else older.push(n);
  }

  const groups: NotificationGroup[] = [
    { id: "today", label: "Today", count: today.length, items: today },
    { id: "yesterday", label: "Yesterday", count: yesterday.length, items: yesterday },
    { id: "week", label: "This week", count: week.length, items: week },
  ];
  if (older.length > 0) {
    groups.push({ id: "older", label: "Older", count: older.length, items: older });
  }
  return groups.filter((g) => g.count > 0);
}
