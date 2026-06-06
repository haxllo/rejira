"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  XIcon,
  Link2Icon,
  PaperclipIcon,
  MessageSquareIcon,
  GitPullRequestIcon,
  MoreHorizontalIcon,
  SendIcon,
  HeartIcon,
  SparklesIcon,
  CheckIcon,
  CalendarIcon,
  TagIcon,
  FlagIcon,
  CopyIcon,
  ShareIcon,
  EditIcon,
  ChevronDownIcon,
  CircleDotIcon,
  CircleCheckIcon,
  ArrowUpRightIcon,
  UserIcon,
  UsersIconCustom,
} from "@/components/icons";
import {
  issueById,
  userById,
  usersByIds,
  commentsFor,
  activityFor,
  cycleById,
  projectById,
  labelById,
  subIssues,
  USERS,
  type Issue,
  type StatusKey,
  type Comment,
  type Activity,
} from "@/lib/mock";
import { StatusDot, getStatusLabel } from "@/components/primitives/status";
import { PriorityIcon, getPriorityLabel } from "@/components/primitives/priority";
import { Avatar } from "@/components/primitives/avatar";
import { LabelChip } from "@/components/primitives/label";
import { relativeTime, dateWithYear, timeOnly, dueLabel, dueIsOverdue } from "@/lib/utils/date";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { apply } from "@/lib/state/mutations";
import { cn } from "@/lib/utils";

const STATUS_ORDER: StatusKey[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];

export function IssueDrawer() {
  const issueId = useUI((s) => s.drawerIssueId);
  const close = useUI((s) => s.closeDrawer);
  const issue = useIssues((s) => s.issues.find((i) => i.id === issueId) ?? null);

  // ⌘1-5 quick status
  React.useEffect(() => {
    if (!issue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < STATUS_ORDER.length) {
        e.preventDefault();
        const target = STATUS_ORDER[idx]!;
        const prev = issue.status;
        useIssues.getState().setStatus(issue.id, target);
        apply({
          message: `Moved to ${getStatusLabel(target)}`,
          affectedIds: [issue.id],
          undo: () => useIssues.getState().setStatus(issue.id, prev),
          retry: () => useIssues.getState().setStatus(issue.id, target),
        });
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
  const cycle = cycleById(issue.cycleId ?? "");
  const project = projectById(issue.projectId);
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2.5 text-[12px] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          {project && (
            <span
              className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
              style={{ background: project.iconColor }}
            >
              {project.iconLetter}
            </span>
          )}
          <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{issue.key}</span>
        </span>
        <span className="text-[var(--color-text-faint)]">/</span>
        <StatusDot status={issue.status} size={7} />
        <span className="text-[var(--color-text-muted)]">{getStatusLabel(issue.status)}</span>
        {cycle && (
          <>
            <span className="text-[var(--color-text-faint)]">·</span>
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[10.5px]">
              {cycle.name.replace(/^Cycle \d+ — /, "")}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
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
  const subs = subIssues(issue.id);
  return (
    <div className="grid grid-cols-[1fr_220px] gap-0">
      <div className="min-w-0 border-r border-[var(--color-border)] px-6 py-5">
        <TitleSection issue={issue} />
        <PropertiesBar issue={issue} />
        <DescriptionSection issue={issue} />
        <SubIssuesSection subs={subs} />
        <ActivityAndComments issue={issue} />
        <ReplyBox issue={issue} />
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
          onBlur={() => {
            setEditing(false);
            const next = title.trim();
            if (next && next !== issue.title) {
              const prev = issue.title;
              useIssues.getState().setTitle(issue.id, next);
              apply({
                message: "Title updated",
                affectedIds: [issue.id],
                undo: () => useIssues.getState().setTitle(issue.id, prev),
                retry: () => useIssues.getState().setTitle(issue.id, next),
              });
            }
          }}
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
  const setStatus = useIssues((s) => s.setStatus);
  const setPriority = useIssues((s) => s.setPriority);
  const toggleAssignee = useIssues((s) => s.toggleAssignee);

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
        label={
          issue.assigneeIds.length === 0
            ? "Unassigned"
            : issue.assigneeIds
                .map((id) => userById(id)?.name.split(" ")[0])
                .filter(Boolean)
                .join(", ")
        }
        icon={<UserIcon size={12} />}
      />
      {issue.estimatePoints != null && (
        <PropertyPill label={`${issue.estimatePoints} pt`} icon={<span className="text-[10px]">●</span>} />
      )}
      {issue.dueDate && (
        <PropertyPill
          label={dueLabel(issue.dueDate)}
          icon={<CalendarIcon size={12} />}
          tone={dueIsOverdue(issue.dueDate) ? "danger" : undefined}
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

function DescriptionSection({ issue }: { issue: Issue }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(issue.description);

  React.useEffect(() => setValue(issue.description), [issue.description]);

  return (
    <section className="mt-6">
      <SectionHeader
        title="Description"
        action={
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
          >
            {editing ? "Save" : "Edit"}
          </button>
        }
      />
      {editing ? (
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (value !== issue.description) {
              const prev = issue.description;
              useIssues.getState().setDescription(issue.id, value);
              apply({
                message: "Description updated",
                affectedIds: [issue.id],
                undo: () => useIssues.getState().setDescription(issue.id, prev),
                retry: () => useIssues.getState().setDescription(issue.id, value),
              });
            }
          }}
          rows={5}
          className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]"
        />
      ) : (
        <p className="whitespace-pre-line text-[13px] leading-[1.6] text-[var(--color-text-muted)]">
          {issue.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-text-faint)]">
        <SparklesIcon size={11} className="text-[var(--color-accent)]" />
        <span>Suggested: add acceptance criteria · 3 sections</span>
      </div>
    </section>
  );
}

function SubIssuesSection({ subs }: { subs: Issue[] }) {
  if (subs.length === 0) return null;
  return (
    <section className="mt-6">
      <SectionHeader title={`Sub-issues (${subs.length})`} action={<button className="text-[11px] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]">+ Add</button>} />
      <div className="mt-2 flex flex-col gap-0.5">
        {subs.map((s) => (
          <button
            key={s.id}
            className="group flex h-8 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-left text-[12px] hover:bg-[var(--color-surface-2)]"
          >
            <StatusDot status={s.status} size={6} />
            <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{s.key}</span>
            <span className="flex-1 truncate text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]">{s.title}</span>
            {s.assigneeIds[0] && <Avatar name={userById(s.assigneeIds[0])?.name ?? "?"} size="xs" />}
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivityAndComments({ issue }: { issue: Issue }) {
  const comments = commentsFor(issue.id);
  const activity = activityFor(issue.id);
  const merged: Array<{ kind: "comment"; at: string; data: Comment } | { kind: "activity"; at: string; data: Activity }> = [
    ...comments.map((c) => ({ kind: "comment" as const, at: c.createdAt, data: c })),
    ...activity.map((a) => ({ kind: "activity" as const, at: a.createdAt, data: a })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section className="mt-6">
      <SectionHeader title="Activity" />
      <ol className="mt-3 flex flex-col gap-3">
        {merged.map((entry, i) =>
          entry.kind === "comment" ? (
            <CommentRow key={`c-${entry.data.id}`} comment={entry.data} />
          ) : (
            <ActivityRow key={`a-${entry.data.id}-${i}`} activity={entry.data} />
          ),
        )}
      </ol>
    </section>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const author = userById(comment.authorId);
  return (
    <li className="flex gap-3">
      <Avatar name={author?.name ?? "?"} size="sm" />
      <div className="flex-1">
        <div className="flex items-baseline gap-2 text-[12px]">
          <span className="font-medium text-[var(--color-text)]">{author?.name}</span>
          <span className="text-[var(--color-text-faint)]">{relativeTime(comment.createdAt)}</span>
        </div>
        <p className="mt-1 text-[13px] leading-[1.55] text-[var(--color-text-muted)]">{comment.body}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          {comment.reactions.map((r, i) => (
            <button
              key={i}
              className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
          <button className="ml-1 text-[10.5px] text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]">Reply</button>
        </div>
      </div>
    </li>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const actor = userById(activity.actorId);
  return (
    <li className="flex items-start gap-2.5 text-[12px] text-[var(--color-text-subtle)]">
      <Avatar name={actor?.name ?? "?"} size="xs" />
      <div className="flex flex-1 items-baseline gap-1.5">
        <span className="font-medium text-[var(--color-text-muted)]">{actor?.name}</span>
        <ActivityBody activity={activity} />
        <span className="text-[var(--color-text-faint)]">· {relativeTime(activity.createdAt)}</span>
      </div>
    </li>
  );
}

function ActivityBody({ activity }: { activity: Activity }) {
  switch (activity.type) {
    case "created":
      return <span>created the issue</span>;
    case "status_changed":
      return (
        <span>
          moved status from{" "}
          <StatusDot status={activity.payload.from as StatusKey} size={6} />{" "}
          to <StatusDot status={activity.payload.to as StatusKey} size={6} />{" "}
          <span className="text-[var(--color-text-muted)]">{getStatusLabel(activity.payload.to as StatusKey)}</span>
        </span>
      );
    case "priority_changed":
      return (
        <span>
          changed priority from <span className="text-[var(--color-text-muted)]">{activity.payload.from as string}</span> to{" "}
          <PriorityIcon priority={activity.payload.to as any} size={10} />
          <span className="text-[var(--color-text-muted)]">{activity.payload.to as string}</span>
        </span>
      );
    case "assignee_changed":
      return <span>added {userById(activity.payload.added as string)?.name} as assignee</span>;
    case "label_added":
      return <span>added label {labelById(activity.payload.label as string)?.name}</span>;
    case "label_removed":
      return <span>removed label {labelById(activity.payload.label as string)?.name}</span>;
    case "title_changed":
      return (
        <span>
          changed title to <span className="text-[var(--color-text-muted)]">"{activity.payload.to as string}"</span>
        </span>
      );
    case "due_changed":
      return <span>changed due date</span>;
    case "mentioned":
      return <span>mentioned someone</span>;
    case "commented":
      return <span>commented</span>;
    default:
      return <span>updated the issue</span>;
  }
}

function ReplyBox({ issue }: { issue: Issue }) {
  const meId = USERS[0]?.id ?? "u_aria";
  const me = USERS.find((u) => u.id === meId)!;
  return (
    <div className="mt-6 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
      <div className="flex items-start gap-2">
        <Avatar name={me.name} size="sm" />
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
  const cycle = cycleById(issue.cycleId ?? "");
  const project = projectById(issue.projectId);
  const assignees = usersByIds(issue.assigneeIds);
  const labels = issue.labelIds.map((id) => labelById(id)).filter((l): l is NonNullable<typeof l> => Boolean(l));
  const subs = subIssues(issue.id);

  return (
    <aside className="px-5 py-5">
      <SideRow label="Status">
        <StatusPicker current={issue.status} issueId={issue.id} />
      </SideRow>
      <SideRow label="Priority">
        <PriorityPicker current={issue.priority} issueId={issue.id} />
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
        {cycle ? (
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
            <span className="shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-1.5 py-0.5 text-[10.5px]">
              C{cycle.number}
            </span>
            <span className="min-w-0 truncate">{cycle.goal}</span>
          </div>
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
              dueIsOverdue(issue.dueDate) ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]",
            )}
          >
            {dateWithYear(issue.dueDate)}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--color-text-faint)]">None</span>
        )}
      </SideRow>
      <SideRow label="Project">
        {project && (
          <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
            <span className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]" style={{ background: project.iconColor }}>{project.iconLetter}</span>
            <span>{project.name}</span>
          </div>
        )}
      </SideRow>

      {issue.pr && (
        <SideRow label="Pull request">
          <a
            href="#"
            className="flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2 py-1 text-[11.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
          >
            <GitPullRequestIcon size={11} />
            <span className="font-mono text-[10.5px]">{issue.pr.repo}#{issue.pr.number}</span>
            <span className="rounded bg-[var(--color-surface-3)] px-1 text-[9.5px] uppercase tracking-wide">{issue.pr.status}</span>
            <ArrowUpRightIcon size={10} />
          </a>
        </SideRow>
      )}

      <SideRow label="Created">
        <span className="text-[12px] text-[var(--color-text-muted)]">{dateWithYear(issue.createdAt)}</span>
      </SideRow>
      <SideRow label="Updated">
        <span className="text-[12px] text-[var(--color-text-muted)]">{relativeTime(issue.updatedAt)}</span>
      </SideRow>

      <SideRow label="Sub-issues">
        <span className="text-[12px] text-[var(--color-text-muted)]">{subs.length}</span>
      </SideRow>
      <SideRow label="Blocked by">
        <span className={cn("text-[12px]", issue.blockedBy.length > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-faint)]")}>
          {issue.blockedBy.length || "—"}
        </span>
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

function StatusPicker({ current, issueId }: { current: StatusKey; issueId: string }) {
  const setStatus = useIssues((s) => s.setStatus);
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
                    if (s !== current) {
                      const prev = current;
                      setStatus(issueId, s);
                      apply({
                        message: `Moved to ${getStatusLabel(s)}`,
                        affectedIds: [issueId],
                        undo: () => useIssues.getState().setStatus(issueId, prev),
                        retry: () => useIssues.getState().setStatus(issueId, s),
                      });
                    }
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

function PriorityPicker({ current, issueId }: { current: Issue["priority"]; issueId: string }) {
  const setPriority = useIssues((s) => s.setPriority);
  return (
    <div className="flex flex-wrap gap-1">
      {(["urgent", "high", "medium", "low", "none"] as const).map((p) => (
        <button
          key={p}
          onClick={() => {
            if (p !== current) {
              const prev = current;
              setPriority(issueId, p);
              apply({
                message: `Priority set to ${p}`,
                affectedIds: [issueId],
                undo: () => useIssues.getState().setPriority(issueId, prev),
                retry: () => useIssues.getState().setPriority(issueId, p),
              });
            }
          }}
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
