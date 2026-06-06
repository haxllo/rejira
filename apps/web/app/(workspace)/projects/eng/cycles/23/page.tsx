"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { CycleBoard } from "@/components/views/cycle-board";
import { ISSUES, cycleById, projectById, type StatusKey } from "@/lib/mock";
import { getStatusLabel } from "@/components/primitives/status";
import { dateWithYear, relativeTime } from "@/lib/utils/date";
import { useUI } from "@/lib/state/ui";
import { CircleCheckIcon, TrendingUpIcon } from "@/components/icons";

export default function CyclePage() {
  const cycle = cycleById("c_23");
  const project = projectById("p_eng");
  const openDrawer = useUI((s) => s.openDrawer);

  const issues = React.useMemo(
    () => ISSUES.filter((i) => i.cycleId === "c_23"),
    [],
  );
  const totalPoints = issues.reduce((acc, i) => acc + (i.estimatePoints ?? 0), 0);
  const donePoints = issues
    .filter((i) => i.status === "done")
    .reduce((acc, i) => acc + (i.estimatePoints ?? 0), 0);
  const doneCount = issues.filter((i) => i.status === "done").length;
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const velocity = 42;

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title={`Cycle 23 — ${cycle?.goal ?? ""}`}
        description={`${dateWithYear(cycle!.startDate)} → ${dateWithYear(cycle!.endDate)} · ${issues.length} issues · ${totalPoints} pts`}
        count={issues.length}
        onNewIssue={() => {}}
        primary={
          <div className="flex items-center gap-3">
            <ProgressBar pct={progressPct} />
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <CircleCheckIcon size={11} className="text-[var(--color-status-done)]" />
                {doneCount}/{issues.length}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <TrendingUpIcon size={11} className="text-[var(--color-accent)]" />
                Velocity {velocity}
              </span>
            </div>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <CycleBoard issues={issues} onOpen={(i) => openDrawer(i.id)} />
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
        />
      </div>
      <span className="font-mono text-[11.5px] font-medium text-[var(--color-text)]">{pct}%</span>
    </div>
  );
}
