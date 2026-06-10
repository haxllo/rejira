'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribeToNotifications } from '@/lib/realtime/subscriptions';
import { useNotifications } from '@/lib/state/notifications';
import { useUser } from '@/hooks/useUser';
import { InboxItem, InboxEmptyState } from '@/components/inbox/inbox-item';
import { ViewHeader } from '@/components/views/view-header';
import type { Notification } from '@/lib/db/types';

type InboxFilter = 'all' | 'unread' | 'mentions';

function groupByDate(items: Notification[]) {
  const now = Date.now();
  const day = 86_400_000;
  const groups: { id: string; label: string; items: Notification[] }[] = [];

  const today = items.filter((n) => now - new Date(n.createdAt).getTime() < day);
  const yesterday = items.filter((n) => {
    const age = now - new Date(n.createdAt).getTime();
    return age >= day && age < 2 * day;
  });
  const week = items.filter((n) => {
    const age = now - new Date(n.createdAt).getTime();
    return age >= 2 * day && age < 7 * day;
  });
  const older = items.filter((n) => now - new Date(n.createdAt).getTime() >= 7 * day);

  if (today.length) groups.push({ id: 'today', label: 'Today', items: today });
  if (yesterday.length) groups.push({ id: 'yesterday', label: 'Yesterday', items: yesterday });
  if (week.length) groups.push({ id: 'week', label: 'This week', items: week });
  if (older.length) groups.push({ id: 'older', label: 'Older', items: older });
  return groups;
}

export function InboxStream({
  initialNotifications,
  actorNames,
  issueMeta,
}: {
  initialNotifications: Notification[];
  actorNames: Record<string, string>;
  issueMeta: Record<string, { key: string; title: string; externalId: string }>;
}) {
  const { user } = useUser();
  const storeNotifications = useNotifications((s) => s.notifications);
  const setNotifications = useNotifications((s) => s.setNotifications);
  const [filter, setFilter] = useState<InboxFilter>('all');

  useEffect(() => {
    setNotifications(initialNotifications);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const sub = subscribeToNotifications(user.id, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === 'INSERT') {
        const newNotif = payload.new as unknown as Notification;
        useNotifications.getState().refetch();
      }
    });
    return () => sub.unsubscribe();
  }, [user?.id]);

  const displayItems = useMemo(() => {
    const items = storeNotifications.length > 0 ? storeNotifications : initialNotifications;
    let filtered = items;
    if (filter === 'unread') filtered = items.filter((n) => !n.read);
    if (filter === 'mentions') filtered = items.filter((n) => n.type === 'issue_mentioned');
    return filtered;
  }, [storeNotifications, initialNotifications, filter]);

  const unreadCount = useMemo(
    () => (storeNotifications.length > 0 ? storeNotifications : initialNotifications).filter((n) => !n.read).length,
    [storeNotifications, initialNotifications],
  );

  const groups = useMemo(() => groupByDate(displayItems), [displayItems]);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Inbox"
        description="Notifications across all projects — never miss a thing."
        count={unreadCount}
        primary={<FilterTabs current={filter} unreadCount={unreadCount} onChange={setFilter} />}
      />
      <div className="flex-1 overflow-y-auto">
        {displayItems.length === 0 ? (
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
                    {g.items.length}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {g.items.map((notif, i) => {
                    const issue = notif.issueId != null ? issueMeta[String(notif.issueId)] : null;
                    return (
                      <InboxItem
                        key={String(notif.id)}
                        notification={notif}
                        actorName={actorNames[String(notif.userId)] ?? null}
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

function FilterTabs({
  current,
  unreadCount,
  onChange,
}: {
  current: InboxFilter;
  unreadCount: number;
  onChange: (filter: InboxFilter) => void;
}) {
  const tabs: { key: InboxFilter; href: string }[] = [
    { key: 'all', href: '/inbox' },
    { key: 'unread', href: '/inbox?filter=unread' },
    { key: 'mentions', href: '/inbox?filter=mentions' },
  ];
  return (
    <div className="flex h-7 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-0.5">
      {tabs.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            data-active={active}
            className="relative grid h-6 place-items-center rounded px-2.5 text-[11.5px] font-medium capitalize text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] data-[active=true]:text-[var(--color-text)]"
          >
            {t.key}
            {t.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 font-mono text-[10px] text-[var(--color-accent)]">{unreadCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
