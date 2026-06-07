'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, BellIcon } from '@/components/icons';
import { Button } from '@/components/primitives/button';

interface NotificationToggle {
  key: string;
  title: string;
  description: string;
}

const NOTIFICATION_TOGGLES: NotificationToggle[] = [
  {
    key: 'issue_assignments',
    title: 'Issue assignments',
    description: 'When you are assigned to an issue',
  },
  {
    key: 'mentions',
    title: 'Mentions',
    description: 'When someone @mentions you in comments',
  },
  {
    key: 'status_changes',
    title: 'Status changes',
    description: 'When issues you follow change status',
  },
  {
    key: 'workspace_invites',
    title: 'Workspace invites',
    description: 'When you are invited to a new workspace',
  },
  {
    key: 'product_updates',
    title: 'Product updates',
    description: 'New features, tips, and release notes',
  },
];

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    issue_assignments: true,
    mentions: true,
    status_changes: false,
    workspace_invites: true,
    product_updates: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/settings/account"
          className="mb-6 inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[120ms]"
        >
          <ChevronLeftIcon size={12} />
          Account
        </Link>

        <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
          Notifications
        </h1>
        <p className="mb-8 text-[13px] text-[var(--color-text-muted)]">
          Choose when and how you want to be notified.
        </p>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Email notifications</h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
              We&apos;ll only send email notifications for the events you choose.
            </p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {NOTIFICATION_TOGGLES.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <div className="text-[13px] font-medium text-[var(--color-text)]">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    {item.description}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[item.key]}
                  onClick={() => toggle(item.key)}
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-[120ms]',
                    prefs[item.key]
                      ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-2)]',
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 600, damping: 36 }}
                    className={cn(
                      'absolute top-0.5 size-3.5 rounded-full bg-white',
                      prefs[item.key] ? 'right-0.5' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--color-border)] px-5 py-3.5">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save preferences'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
