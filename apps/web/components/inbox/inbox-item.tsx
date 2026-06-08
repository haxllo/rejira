'use client';

import * as React from "react";
import { motion } from "motion/react";
import { Avatar } from "@/components/primitives/avatar";
import { relativeTime } from "@/lib/utils/date";
import { ArrowUpRightIcon, AtSignIcon, CheckIcon, LoaderCircleIcon } from "@/components/icons";
import type { Notification } from "@/lib/db/types";

export interface InboxItemProps {
  notification: Notification;
  actorName?: string | null;
  issueKey?: string | null;
  issueTitle?: string | null;
  onOpen?: (issueExternalId: string) => void;
  index?: number;
}

const VERB_LABELS: Record<Notification["type"], { text: string; variant: "muted" | "danger" }> = {
  issue_assigned: { text: "assigned you to", variant: "muted" },
  issue_mentioned: { text: "mentioned you on", variant: "muted" },
  issue_commented: { text: "commented on", variant: "muted" },
  issue_status_changed: { text: "changed status of", variant: "muted" },
  cycle_started: { text: "started a cycle in", variant: "muted" },
  cycle_ended: { text: "ended a cycle in", variant: "muted" },
};

export function InboxItem({
  notification,
  actorName,
  issueKey,
  issueTitle,
  onOpen,
  index = 0,
}: InboxItemProps) {
  const isMention = notification.type === "issue_mentioned";
  const label = VERB_LABELS[notification.type] ?? { text: "updated", variant: "muted" as const };
  const name = actorName ?? "rejira";
  const handleOpen = () => {
    if (onOpen && notification.issueId !== null) {
      onOpen(String(notification.issueId));
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.18), type: "spring", stiffness: 320, damping: 28 }}
      className="group"
    >
      <button
        onClick={handleOpen}
        disabled={!onOpen || notification.issueId === null}
        className="flex w-full items-start gap-3 px-6 py-2.5 text-left hover:bg-[var(--color-surface-1)] disabled:cursor-default disabled:hover:bg-transparent"
      >
        {!notification.read && (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
        )}
        {notification.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-transparent" />}
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[12.5px] leading-[1.5]">
            {label.variant === "muted" && (
              <span className="shrink-0 font-medium text-[var(--color-text)]">{name}</span>
            )}
            <span
              className={
                label.variant === "danger"
                  ? "shrink-0 text-[var(--color-danger)]"
                  : "shrink-0 text-[var(--color-text-muted)]"
              }
            >
              {isMention ? (
                <span className="flex items-center gap-1">
                  mentioned you on <AtSignIcon size={10} />
                </span>
              ) : (
                label.text
              )}
            </span>
            {issueKey && (
              <>
                <span className="shrink-0 font-mono text-[10.5px] text-[var(--color-text-faint)]">
                  {issueKey}
                </span>
                {issueTitle && (
                  <span className="min-w-0 truncate text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">
                    — {issueTitle}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-faint)]">
            <span>{relativeTime(notification.createdAt.toISOString())}</span>
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

export function InboxEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-accent)]">
        <CheckIcon size={18} />
      </div>
      <h2 className="mt-4 text-[14px] font-semibold text-[var(--color-text)]">
        You&apos;re all caught up
      </h2>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        No new notifications — your inbox is empty.
      </p>
    </div>
  );
}

export function InboxLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-text-faint)]">
        <LoaderCircleIcon size={18} />
      </div>
      <p className="mt-4 text-[12.5px] text-[var(--color-text-muted)]">Loading notifications…</p>
    </div>
  );
}
