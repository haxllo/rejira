"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import {
  InboxIcon,
  ListIconCustom,
  RowsIcon,
  KanbanIconCustom,
  StarIcon,
  GanttIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  HomeIcon,
  CircleDotIcon,
  CircleCheckIcon,
  CircleIcon,
} from "@/components/icons";
import { PROJECTS, ME_ID, INBOX, issuesAssignedTo } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/primitives/kbd";

export function PrimaryNav() {
  const path = usePathname() ?? "";
  const unread = INBOX.filter((i) => !i.read).length;
  const myIssuesCount = issuesAssignedTo(ME_ID).length;

  return (
    <nav className="flex w-[244px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg)] py-3">
      <div className="flex flex-col gap-0.5 px-2">
        <NavItem href="/inbox" label="Inbox" icon={<InboxIcon size={15} />} badge={unread} active={path.startsWith("/inbox")} />
        <NavItem href="/my-issues" label="My Issues" icon={<ListIconCustom size={15} />} badge={myIssuesCount} active={path.startsWith("/my-issues")} />
        <NavItem href="/" label="Home" icon={<HomeIcon size={15} />} active={path === "/"} />
      </div>

      <div className="mt-5 flex items-center justify-between px-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
          Workspace
        </span>
        <button
          aria-label="Add project"
          className="grid size-4 place-items-center rounded text-[var(--color-text-faint)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-muted)]"
        >
          <PlusIcon size={12} />
        </button>
      </div>

      <div className="mt-1.5 flex flex-col gap-0.5 px-2">
        {PROJECTS.map((p) => {
          const isActive = path.includes(`/projects/${p.key.toLowerCase()}`);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.key.toLowerCase()}/issues`}
              className={cn(
                "group flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] text-[var(--color-text-muted)] transition-colors",
                "hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
                isActive && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
              )}
            >
              <span
                className="grid size-4 place-items-center rounded text-[9px] font-bold text-[oklch(0.16_0.005_250)]"
                style={{ background: p.iconColor }}
              >
                {p.iconLetter}
              </span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="opacity-0 group-hover:opacity-100 text-[var(--color-text-faint)]">
                <ChevronsUpDownIcon size={11} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between px-4">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
          Views
        </span>
      </div>

      <div className="mt-1.5 flex flex-col gap-0.5 px-2">
        <ViewItem href="/projects/eng/issues" label="All Issues" icon={<RowsIcon size={15} />} active={path === "/projects/eng/issues"} />
        <ViewItem href="/projects/eng/cycles/23" label="Active Cycle" icon={<KanbanIconCustom size={15} />} active={path.includes("/cycles")} />
        <ViewItem href="#" label="Roadmap" icon={<GanttIcon size={15} />} />
        <ViewItem href="#" label="Starred" icon={<StarIcon size={14} />} />
      </div>

      <div className="mt-auto px-3 pb-2">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5">
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            <CircleDotIcon size={11} className="text-[var(--color-success)]" />
            <span>Cycle 23 — 2 days left</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "62%" }}
              transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-[oklch(0.78_0.15_200)] to-[oklch(0.78_0.16_150)]"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-[var(--color-text-subtle)]">
            <span>26 / 42 pts</span>
            <span>62%</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] text-[var(--color-text-muted)] transition-colors",
        "hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
        active && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
      )}
    >
      <span className="text-[var(--color-text-faint)] group-hover:text-[var(--color-text-muted)]">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-[var(--color-surface-3)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]">
          {badge}
        </span>
      )}
    </Link>
  );
}

function ViewItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] text-[var(--color-text-muted)] transition-colors",
        "hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
        active && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
      )}
    >
      <span className="text-[var(--color-text-faint)]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}
