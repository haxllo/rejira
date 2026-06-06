"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  XIcon,
  PlusIcon,
  SendIcon,
  CircleDotIcon,
  FlagIcon,
  UserIcon,
  TagIcon,
  CalendarIcon,
  HashIcon,
  SparklesIcon,
} from "@/components/icons";
import { useUI } from "@/lib/state/ui";
import { useIssues } from "@/lib/state/issues";
import { apply } from "@/lib/state/mutations";
import { PROJECTS, USERS, type StatusKey, type PriorityKey } from "@/lib/mock";
import { StatusDot, getStatusLabel } from "@/components/primitives/status";
import { PriorityIcon, getPriorityLabel } from "@/components/primitives/priority";
import { Avatar } from "@/components/primitives/avatar";
import { cn } from "@/lib/utils";

const STATUS_ORDER: StatusKey[] = ["backlog", "todo", "in_progress", "in_review", "done"];
const PRIORITY_ORDER: PriorityKey[] = ["urgent", "high", "medium", "low", "none"];

export function CreateIssueDialog() {
  const open = useUI((s) => s.createIssueOpen);
  const close = useUI((s) => s.closeCreateIssue);
  const [title, setTitle] = React.useState("");
  const [projectId, setProjectId] = React.useState("p_eng");
  const [status, setStatus] = React.useState<StatusKey>("todo");
  const [priority, setPriority] = React.useState<PriorityKey>("none");
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>(["u_aria"]);
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTitle("");
      setProjectId("p_eng");
      setStatus("todo");
      setPriority("none");
      setAssigneeIds(["u_aria"]);
      setTimeout(() => titleRef.current?.focus(), 60);
    }
  }, [open]);

  const project = PROJECTS.find((p) => p.id === projectId)!;

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    const newId = useIssues.getState().addIssue({
      projectId,
      title: t,
      description: "",
      status,
      priority,
      assigneeIds,
      authorId: "u_aria",
      labelIds: [],
    });
    const created = useIssues.getState().issues.find((i) => i.id === newId)!;
    apply({
      message: `Created ${created.key}`,
      detail: created.title,
      affectedIds: [newId],
      undo: () => useIssues.getState().archiveIssue(newId),
      retry: () => useIssues.getState().unarchiveIssue(newId),
      viewAction: { label: "View", run: () => useUI.getState().openDrawer(newId) },
    });
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-[var(--color-overlay)] px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={close}
        >
          <motion.div
            initial={{ y: 10, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 6, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-lg overflow-hidden rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] shadow-[var(--shadow-drawer)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Create new issue"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                <PlusIcon size={12} />
                <span>New issue</span>
                <span className="text-[var(--color-text-faint)]">·</span>
                <span
                  className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                  style={{ background: project.iconColor }}
                >
                  {project.iconLetter}
                </span>
                <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{project.key}-</span>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="grid size-6 place-items-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]"
              >
                <XIcon size={12} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Issue title"
                  className="w-full bg-transparent text-[16px] font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <SegmentedControl<StatusKey>
                    value={status}
                    onChange={setStatus}
                    options={STATUS_ORDER.map((s) => ({
                      value: s,
                      label: getStatusLabel(s),
                      icon: <StatusDot status={s} size={7} />,
                    }))}
                  />
                </Field>
                <Field label="Priority">
                  <SegmentedControl<PriorityKey>
                    value={priority}
                    onChange={setPriority}
                    options={PRIORITY_ORDER.map((p) => ({
                      value: p,
                      label: getPriorityLabel(p),
                      icon: <PriorityIcon priority={p} size={10} />,
                    }))}
                  />
                </Field>
              </div>

              <Field label="Assignees">
                <div className="flex flex-wrap items-center gap-1.5">
                  {USERS.slice(0, 8).map((u) => {
                    const selected = assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() =>
                          setAssigneeIds((prev) =>
                            selected ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                          )
                        }
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] py-0.5 pl-0.5 pr-2 transition-colors hover:border-[var(--color-border-strong)]",
                          selected && "border-[var(--color-accent)] bg-[var(--color-accent-soft)]",
                        )}
                      >
                        <Avatar name={u.name} size="xs" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">{u.name.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-faint)]">
                <span className="flex items-center gap-1">
                  <SparklesIcon size={11} className="text-[var(--color-accent)]" />
                  <span>AI will suggest labels and assignees</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-2.5">
              <div className="flex items-center gap-2 text-[10.5px] text-[var(--color-text-faint)]">
                <span className="flex items-center gap-1">
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                  to create
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Kbd>Esc</Kbd>
                  to cancel
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={close}
                  className="h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[12px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!title.trim()}
                  className="flex h-7 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-2.5 text-[12px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 disabled:opacity-40"
                >
                  <SendIcon size={11} />
                  Create issue
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-6 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 text-[10.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]",
            value === o.value && "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1 text-[9.5px] font-mono text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}
