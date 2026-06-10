'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  XIcon,
  PaperclipIcon,
  MessageSquareIcon,
  SparklesIcon,
  CheckIcon,
  CalendarIcon,
  ChevronDownIcon,
  UserIcon,
  SendIcon,
  MoreHorizontalIcon,
  ShareIcon,
} from '@/components/icons';
import { StatusDot, getStatusLabel } from '@/components/primitives/status';
import { PriorityIcon, getPriorityLabel } from '@/components/primitives/priority';
import { Avatar } from '@/components/primitives/avatar';
import { LabelChip } from '@/components/primitives/label';
import { relativeTime, dateWithYear, dueLabel, dueIsOverdue } from '@/lib/utils/date';
import { useUI } from '@/lib/state/ui';
import { lookupUser, type UserView } from '@/lib/state/users';
import { lookupLabel, type LabelView } from '@/lib/state/labels';
import { cn } from '@/lib/utils';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import { usePresence } from '@/lib/realtime/presence';
import { IssueDescriptionEditor } from '@/components/issue/issue-description-editor';
import type { Issue, StatusKey, PriorityKey } from '@/lib/db/types';

const STATUS_ORDER: StatusKey[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'];

interface Props {
  issues: Issue[];
}

export function IssueDrawer({ issues }: Props) {
  const issueId = useUI((s) => s.drawerIssueId);
  const close = useUI((s) => s.closeDrawer);
  const issue = React.useMemo(
    () => (issueId ? issues.find((i) => i.externalId === issueId) ?? null : null),
    [issueId, issues],
  );

  React.useEffect(() => {
    if (!issue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < STATUS_ORDER.length) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issue]);

  return (
    <AnimatePresence>
      {issue && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-[var(--color-overlay)] backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={close}
          />
          <motion.aside
            className={cn(
              "fixed right-0 top-0 z-50 flex h-full w-full max-w-[680px] flex-col border-l border-[var(--color-border-strong)]",
              "bg-[var(--color-bg)] shadow-[var(--shadow-drawer)]",
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            role="dialog"
            aria-label="Issue details"
          >
            <DrawerHeader issue={issue} onClose={close} />
            <div className="flex-1 overflow-y-auto">
              <DrawerBody issue={issue} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerHeader({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const { onlineUsers } = usePresence();
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2.5 text-[12px] text-[var(--color-text-muted)]">
        <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{issue.key}</span>
        <span className="text-[var(--color-text-faint)]">/</span>
        <StatusDot status={issue.status} size={7} />
        <span className="text-[var(--color-text-muted)]">{getStatusLabel(issue.status)}</span>
        {issue.cycleId && (
          <>
            <span className="text-[var(--color-text-faint)]">·</span>
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[10.5px]">
              Cycle #{String(issue.cycleId)}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {onlineUsers.length > 0 && (
          <div className="mr-1 flex -space-x-1.5">
            {onlineUsers.slice(0, 5).map((u) => (
              <div key={u.userId} className="relative">
                <Avatar name={u.name} size="xs" />
              </div>
            ))}
            {onlineUsers.length > 5 && (
              <span className="z-10 flex size-5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[9px] text-[var(--color-text-faint)]">
                +{onlineUsers.length - 5}
              </span>
            )}
          </div>
        )}
        <IconBtn icon={<ShareIcon size={14} />} label="Share" />
        <IconBtn icon={<MoreHorizontalIcon size={14} />} label="More" />
        <button
          onClick={onClose}
          className="ml-1 flex size-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
          aria-label="Close drawer (Esc)"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}

function DrawerBody({ issue }: { issue: Issue }) {
  return (
    <div className="grid grid-cols-[1fr_220px] gap-0">
      <div className="min-w-0 border-r border-[var(--color-border)] px-6 py-5">
        <TitleSection issue={issue} />
        <PropertiesBar issue={issue} />
        <YjsDescriptionSection issue={issue} />
        <ActivityAndComments issue={issue} />
        <ReplyBox />
      </div>
      <SidePanel issue={issue} />
    </div>
  );
}

function TitleSection({ issue }: { issue: Issue }) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(issue.title);
  React.useEffect(() => setTitle(issue.title), [issue.title]);
  return (
    <div className="group">
      {editing ? (
        <textarea
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            } else if (e.key === "Escape") {
              setTitle(issue.title);
              setEditing(false);
            }
          }}
          rows={2}
          className="w-full resize-none bg-transparent text-[20px] font-semibold leading-[1.3] text-[var(--color-text)] outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="-ml-1 block w-full rounded px-1 text-left text-[20px] font-semibold leading-[1.3] text-[var(--color-text)] hover:bg-[var(--color-surface-1)]"
        >
          {issue.title}
        </button>
      )}
    </div>
  );
}

function PropertiesBar({ issue }: { issue: Issue }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <PropertyPill
        label={getStatusLabel(issue.status)}
        icon={<StatusDot status={issue.status} size={7} />}
      />
      <PropertyPill
        label={getPriorityLabel(issue.priority)}
        icon={<PriorityIcon priority={issue.priority} size={11} />}
      />
      <PropertyPill
        label="Unassigned"
        icon={<UserIcon size={12} />}
      />
      {issue.estimatePoints != null && (
        <PropertyPill label={`${issue.estimatePoints} pt`} icon={<span className="text-[10px]">●</span>} />
      )}
      {issue.dueDate && (
        <PropertyPill
          label={dueLabel(issue.dueDate.toISOString())}
          icon={<CalendarIcon size={12} />}
          tone={dueIsOverdue(issue.dueDate.toISOString()) ? "danger" : undefined}
        />
      )}
    </div>
  );
}

function PropertyPill({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 text-[11px] font-medium text-[var(--color-text-muted)]",
        "hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
        tone === "danger" && "text-[var(--color-danger)] border-[var(--color-danger)]/30",
      )}
    >
      <span className="text-[var(--color-text-faint)]">{icon}</span>
      {label}
    </button>
  );
}

function YjsDescriptionSection({ issue }: { issue: Issue }) {
  return (
    <section className="mt-6">
      <SectionHeader title="Description" />
      <div className="mt-3">
        <IssueDescriptionEditor
          issueExternalId={issue.externalId}
          initialDescription={issue.description ?? ''}
        />
      </div>
    </section>
  );
}

function ActivityAndComments({ issue }: { issue: Issue }) {
  useRealtimeComments(issue.externalId);
  return (
    <section className="mt-6">
      <SectionHeader title="Activity" />
      <ol className="mt-3 flex flex-col gap-3">
        <li className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-[11.5px] text-[var(--color-text-faint)]">
          Comments and activity stream — wired in Plan 04
        </li>
      </ol>
    </section>
  );
}

function ReplyBox() {
  return (
    <div className="mt-6 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
      <div className="flex items-start gap-2">
        <Avatar name="You" size="sm" />
        <textarea
          placeholder="Write a comment… (⌘↵ to send)"
          rows={2}
          className="flex-1 resize-none bg-transparent text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[var(--color-text-faint)]">
          <button className="rounded p-1 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)]" aria-label="Attach">
            <PaperclipIcon size={12} />
          </button>
          <button className="rounded p-1 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)]" aria-label="Mention">
            <span className="text-[11px] font-mono">@</span>
          </button>
          <button className="rounded p-1 hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)]" aria-label="AI assist">
            <SparklesIcon size={12} className="text-[var(--color-accent)]" />
          </button>
        </div>
        <button className="flex h-6 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-2.5 text-[11.5px] font-medium text-[var(--color-text-inverse)] hover:opacity-90">
          <SendIcon size={11} />
          Comment
        </button>
      </div>
    </div>
  );
}

function SidePanel({ issue }: { issue: Issue }) {
  const assignees: UserView[] = ((issue.assigneeIds as unknown as Array<string | number | bigint>) ?? [])
    .map((id) => lookupUser(id))
    .filter((u): u is UserView => Boolean(u));
  const labels: LabelView[] = ((issue.labelIds as unknown as Array<string | number | bigint>) ?? [])
    .map((id) => lookupLabel(id))
    .filter((l): l is LabelView => Boolean(l));

  return (
    <aside className="px-5 py-5">
      <SideRow label="Status">
        <StatusPicker current={issue.status} />
      </SideRow>
      <SideRow label="Priority">
        <PriorityPicker current={issue.priority} />
      </SideRow>
      <SideRow label="Assignees">
        <div className="flex flex-wrap items-center gap-1.5">
          {assignees.length === 0 && <span className="text-[12px] text-[var(--color-text-faint)]">Unassigned</span>}
          {assignees.map((u) => (
            <div key={u.id} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] py-0.5 pl-0.5 pr-2">
              <Avatar name={u.name} size="xs" />
              <span className="text-[11.5px] text-[var(--color-text-muted)]">{u.name.split(" ")[0]}</span>
            </div>
          ))}
          <button className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]" aria-label="Add assignee">
            <span className="text-[14px] leading-none">+</span>
          </button>
        </div>
      </SideRow>
      <SideRow label="Labels">
        <div className="flex flex-wrap items-center gap-1.5">
          {labels.length === 0 && <span className="text-[12px] text-[var(--color-text-faint)]">None</span>}
          {labels.map((l) => (
            <LabelChip key={l.id} name={l.name} />
          ))}
        </div>
      </SideRow>
      <SideRow label="Cycle">
        {issue.cycleId ? (
          <span className="text-[12px] text-[var(--color-text-muted)]">Cycle #{String(issue.cycleId)}</span>
        ) : (
          <span className="text-[12px] text-[var(--color-text-faint)]">No cycle</span>
        )}
      </SideRow>
      <SideRow label="Estimate">
        <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
          {issue.estimatePoints != null ? `${issue.estimatePoints} points` : "Not set"}
        </span>
      </SideRow>
      <SideRow label="Due date">
        {issue.dueDate ? (
          <span
            className={cn(
              "text-[12px]",
              dueIsOverdue(issue.dueDate.toISOString()) ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]",
            )}
          >
            {dateWithYear(issue.dueDate.toISOString())}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--color-text-faint)]">None</span>
        )}
      </SideRow>
      <SideRow label="Created">
        <span className="text-[12px] text-[var(--color-text-muted)]">{dateWithYear(issue.createdAt.toISOString())}</span>
      </SideRow>
      <SideRow label="Updated">
        <span className="text-[12px] text-[var(--color-text-muted)]">{relativeTime(issue.updatedAt.toISOString())}</span>
      </SideRow>
    </aside>
  );
}

function SideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function StatusPicker({ current }: { current: StatusKey }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex w-full items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-1 text-[12px] text-[var(--color-text)] hover:border-[var(--color-border-strong)]"
      >
        <StatusDot status={current} size={7} />
        <span className="flex-1 text-left">{getStatusLabel(current)}</span>
        <ChevronDownIcon size={11} className="text-[var(--color-text-faint)]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -2, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-[var(--shadow-popover)]"
          >
            {STATUS_ORDER.map((s, i) => (
              <li key={s}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]",
                    s === current && "text-[var(--color-text)]",
                  )}
                >
                  <span className="grid w-4 place-items-center font-mono text-[10px] text-[var(--color-text-faint)]">{i + 1}</span>
                  <StatusDot status={s} size={7} />
                  <span className="flex-1">{getStatusLabel(s)}</span>
                  {s === current && <CheckIcon size={11} className="text-[var(--color-accent)]" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriorityPicker({ current }: { current: PriorityKey }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(['urgent', 'high', 'medium', 'low', 'none'] as const).map((p) => (
        <button
          key={p}
          className={cn(
            "flex h-6 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 text-[10.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
            current === p && "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]",
          )}
        >
          <PriorityIcon priority={p} size={10} />
          {getPriorityLabel(p)}
        </button>
      ))}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{title}</h3>
      {action}
    </div>
  );
}

function IconBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
    >
      {icon}
    </button>
  );
}
