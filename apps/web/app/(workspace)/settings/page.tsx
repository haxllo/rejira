'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  UserIcon,
  LockIcon,
  ActivityIcon,
  BellIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from '@/components/icons';

interface SettingCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const SETTINGS_CARDS: SettingCard[] = [
  {
    title: 'Account',
    description: 'Profile, email, and password',
    href: '/settings/account',
    icon: <UserIcon size={18} />,
  },
  {
    title: 'Security',
    description: 'Password policy and two-factor authentication',
    href: '/settings/account/security',
    icon: <LockIcon size={18} />,
  },
  {
    title: 'Sessions',
    description: 'Active sessions and device management',
    href: '/settings/account/sessions',
    icon: <ActivityIcon size={18} />,
  },
  {
    title: 'Data & Privacy',
    description: 'Export your data or delete your account',
    href: '/settings/account/data',
    icon: <ShieldCheckIcon size={18} />,
  },
  {
    title: 'Notifications',
    description: 'Email notification preferences',
    href: '/settings/account/notifications',
    icon: <BellIcon size={18} />,
  },
  {
    title: 'Members',
    description: 'Manage workspace members and invitations',
    href: '/settings/members',
    icon: <UsersIcon size={18} />,
  },
];

export default function SettingsPage() {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Manage your account and workspace preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SETTINGS_CARDS.map((card, i) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 32,
                delay: i * 0.04,
              }}
            >
              <Link
                href={card.href}
                className={cn(
                  'group flex items-start gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5',
                  'transition-[background-color,box-shadow] duration-[120ms]',
                  'hover:bg-[var(--color-surface-2)] hover:shadow-[var(--shadow-1)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] group-hover:bg-[var(--color-surface-3)] transition-colors duration-[120ms]">
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[var(--color-text)]">
                    {card.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)] leading-snug">
                    {card.description}
                  </div>
                </div>
                <ChevronRightIcon
                  size={14}
                  className="mt-1 shrink-0 text-[var(--color-text-faint)] group-hover:text-[var(--color-text-muted)] transition-colors duration-[120ms]"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
