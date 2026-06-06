"use client";

import * as React from "react";
import { motion } from "motion/react";
import { notFound } from "next/navigation";
import { ViewHeader } from "@/components/views/view-header";
import { Avatar } from "@/components/primitives/avatar";
import { StatusDot } from "@/components/primitives/status";
import { PriorityIcon } from "@/components/primitives/priority";
import { PROJECTS, CYCLES, ISSUES, USERS, userById } from "@/lib/mock";
import { getStatusLabel } from "@/components/primitives/status";
import { useUI } from "@/lib/state/ui";
import { relativeTime, dateWithYear } from "@/lib/utils/date";
import {
  KanbanIconCustom,
  RowsIcon,
  GanttIcon,
  UsersIconCustom,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export default function ProjectLandingPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = React.use(params);
  const project = PROJECTS.find((p) => p.key.toLowerCase() === key.toLowerCase());
  if (!project) return notFound();

  const openDrawer = useUI((s) => s.openDrawer);
  const issues = ISSUES.filter((i) => i.projectId === project.id);
  const open = issues.filter((i) => i.status !== "done" && i.status !== "cancelled");
  const recent = [...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const projectCycles = CYCLES.filter((c) => c.projectId === project.id);
  const members = USERS.filter((u) => project.members.includes(u.id));

  const totalPts = open.reduce((acc, i) => acc + (i.estimatePoints ?? 0), 0);
  const doneThisWeek = issues.filter((i) => i.status === "done" && i.updatedAt > "2026-05-30").length;

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={
          <span className="flex items-center gap-2">
            <span
              className="grid size-6 place-items-center rounded text-[12px] font-bold text-[oklch(0.16_0.005_250)]"
              style={{ background: project.iconColor }}
            >
              {project.iconLetter}
            </span>
            {project.name}
          </span>
        }
        description={project.description}
        count={open.length}
        onNewIssue={() => useUI.getState().openCreateIssue()}
        primary={
          <div className="flex h-7 items-center gap-1.5">
            <NavLink href={`/projects/${project.key.toLowerCase()}/issues`} icon={<RowsIcon size={12} />} label="Issues" />
            <NavLink href={`/projects/${project.key.toLowerCase()}/cycles/23`} icon={<KanbanIconCustom size={12} />} label="Cycles" />
            <NavLink href={`/projects/${project.key.toLowerCase()}/roadmap`} icon={<GanttIcon size={12} />} label="Roadmap" />
          </div>
        }
      />

      <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto p-6">
        <Stat label="Open issues" value={open.length} sub={`${totalPts} pts total`} />
        <Stat label="Completed this week" value={doneThisWeek} sub="↑ 4 vs last week" tone="success" />
        <Stat label="Team" value={members.length} sub={`${members.filter((m) => m.status === "online").length} online`} />

        <Card title="Active cycles" className="col-span-2">
          {projectCycles.length === 0 ? (
            <Empty>No cycles yet</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {projectCycles.map((c) => {
                const cIssues = ISSUES.filter((i) => i.cycleId === c.id);
                const total = cIssues.length;
                const done = cIssues.filter((i) => i.status === "done").length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => useUI.setState({})}
                      className="block w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-left hover:border-[var(--color-border-strong)]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[12.5px] font-medium text-[var(--color-text)]">Cycle {c.number} — {c.goal}</div>
                          <div className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
                            {dateWithYear(c.startDate)} → {dateWithYear(c.endDate)} · {total} issues
                          </div>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)]">{done}/{total} · {pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: "spring", stiffness: 200, damping: 28 }}
                          className="h-full rounded-full bg-[var(--color-accent)]"
                        />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Members">
          <ul className="space-y-1.5">
            {members.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-center gap-2 text-[12px]">
                <Avatar name={u.name} size="sm" status={u.status} />
                <span className="flex-1 text-[var(--color-text-muted)]">{u.name}</span>
                <span className="text-[10.5px] text-[var(--color-text-faint)]">{u.role}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-faint)]">
            <span className="flex items-center gap-1.5">
              <UsersIconCustom size={11} />
              {members.length} members
            </span>
            <button className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">+ Invite</button>
          </div>
        </Card>

        <Card title="Recent activity" className="col-span-2">
          {recent.length === 0 ? (
            <Empty>Nothing here yet</Empty>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {recent.map((i) => {
                const a = i.assigneeIds[0] ? userById(i.assigneeIds[0]) : null;
                return (
                  <li key={i.id}>
                    <button
                      onClick={() => openDrawer(i.id)}
                      className="flex w-full items-center gap-3 py-2 text-left hover:bg-[var(--color-surface-1)]"
                    >
                      <StatusDot status={i.status} size={7} />
                      <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                      <span className="flex-1 truncate text-[12.5px] text-[var(--color-text-muted)]">{i.title}</span>
                      <PriorityIcon priority={i.priority} size={10} />
                      {a && <Avatar name={a.name} size="xs" />}
                      <span className="text-[10.5px] text-[var(--color-text-faint)]">{relativeTime(i.updatedAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Status breakdown">
          <ul className="space-y-1.5">
            {(["backlog", "todo", "in_progress", "in_review", "done"] as const).map((s) => {
              const n = issues.filter((i) => i.status === s).length;
              const pct = issues.length ? (n / issues.length) * 100 : 0;
              return (
                <li key={s} className="flex items-center gap-2 text-[12px]">
                  <StatusDot status={s} size={6} />
                  <span className="w-20 text-[var(--color-text-muted)]">{getStatusLabel(s)}</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: `var(--color-status-${s.replace("_", "-")})` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-[10.5px] text-[var(--color-text-faint)]">{n}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: "success" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[24px] font-semibold text-[var(--color-text)]">{value}</span>
      </div>
      <div className={cn("mt-0.5 text-[11px]", tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-text-faint)]")}>{sub}</div>
    </motion.div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4", className)}>
      <div className="mb-3 flex items-center gap-1.5">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 text-[11.5px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]"
    >
      {icon}
      {label}
    </a>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-dashed border-[var(--color-border)] p-6 text-center text-[12px] text-[var(--color-text-faint)]">{children}</div>;
}
