"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { PROJECTS, CYCLES } from "@/lib/mock";
import { useIssues } from "@/lib/state/issues";
import { TrendingUpIcon, ArrowUpRightIcon, CircleCheckIcon, ClockIcon, SparklesIcon } from "@/components/icons";

export default function HomePage() {
  const me = "Aria";
  const issues = useIssues((s) => s.issues);
  const myIssues = issues.filter((i) => i.assigneeIds.includes("u_aria") && i.status !== "done" && i.status !== "cancelled");
  const upcoming = [...issues]
    .filter((i) => i.dueDate && i.status !== "done" && i.status !== "cancelled")
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 5);
  const recent = [...issues].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`Welcome back, ${me}`}
        description="Tuesday, June 6 · here's your snapshot for today."
      />
      <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-6">
        <Card title="My open issues" icon={<ClockIcon size={12} />} value={myIssues.length}>
          <ul className="space-y-1.5">
            {myIssues.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                <span className="flex-1 truncate text-[var(--color-text-muted)]">{i.title}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Up next" icon={<TrendingUpIcon size={12} />}>
          <ul className="space-y-1.5">
            {upcoming.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                <span className="flex-1 truncate text-[var(--color-text-muted)]">{i.title}</span>
                <span className="text-[10.5px] text-[var(--color-text-faint)]">{i.dueDate?.slice(5)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent activity" icon={<SparklesIcon size={12} />}>
          <ul className="space-y-1.5">
            {recent.map((i) => (
              <li key={i.id} className="flex items-center gap-2 text-[12px]">
                <span className="font-mono text-[10.5px] text-[var(--color-text-faint)]">{i.key}</span>
                <span className="flex-1 truncate text-[var(--color-text-muted)]">{i.title}</span>
                <span className="text-[10.5px] text-[var(--color-text-faint)]">{i.updatedAt.slice(5, 10)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Active projects" icon={<ArrowUpRightIcon size={12} />}>
          <ul className="space-y-1.5">
            {PROJECTS.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[12px]">
                <span
                  className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                  style={{ background: p.iconColor }}
                >
                  {p.iconLetter}
                </span>
                <span className="flex-1 truncate text-[var(--color-text-muted)]">{p.name}</span>
                <span className="text-[10.5px] text-[var(--color-text-faint)]">
                  {issues.filter((i) => i.projectId === p.id && i.status !== "done").length} open
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon, value, children }: { title: string; icon: React.ReactNode; value?: number; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <span className="text-[var(--color-text-faint)]">{icon}</span>
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{title}</h3>
        {value != null && <span className="ml-auto font-mono text-[10.5px] text-[var(--color-text-faint)]">{value}</span>}
      </div>
      {children}
    </motion.div>
  );
}
