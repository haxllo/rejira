"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ViewHeader } from "@/components/views/view-header";
import { cn } from "@/lib/utils";
import {
  SettingsIcon,
  UsersIconCustom,
  ListIcon,
  KanbanIconCustom,
  SparklesIcon,
  CreditCardIcon,
  CheckIcon,
  ArrowUpRightIcon,
  LinkIcon,
  LockIcon,
} from "@/components/icons";

type Section = "general" | "members" | "issues" | "cycles" | "ai" | "billing" | "integrations" | "security";

const SECTIONS: Array<{ id: Section; label: string; icon: React.ReactNode; group: string }> = [
  { id: "general", label: "General", icon: <SettingsIcon size={13} />, group: "Workspace" },
  { id: "members", label: "Members", icon: <UsersIconCustom size={13} />, group: "Workspace" },
  { id: "security", label: "Security", icon: <LockIcon size={13} />, group: "Workspace" },
  { id: "issues", label: "Issues", icon: <ListIcon size={13} />, group: "Workflow" },
  { id: "cycles", label: "Cycles", icon: <KanbanIconCustom size={13} />, group: "Workflow" },
  { id: "ai", label: "AI", icon: <SparklesIcon size={13} />, group: "Workflow" },
  { id: "integrations", label: "Integrations", icon: <LinkIcon size={13} />, group: "Account" },
  { id: "billing", label: "Billing", icon: <CreditCardIcon size={13} />, group: "Account" },
];

export default function SettingsPage() {
  const [section, setSection] = React.useState<Section>("general");

  const groups = Array.from(
    SECTIONS.reduce((m, s) => {
      const arr = m.get(s.group) ?? [];
      arr.push(s);
      m.set(s.group, arr);
      return m;
    }, new Map<string, typeof SECTIONS>()),
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-[220px] shrink-0 flex-col gap-4 border-r border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-5 lg:flex">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
          Settings
        </div>
        {groups.map(([g, items]) => (
          <div key={g}>
            <div className="mb-1 px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              {g}
            </div>
            <ul className="flex flex-col gap-0.5">
              {items.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSection(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text)]",
                      section === s.id && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
                    )}
                  >
                    <span className="text-[var(--color-text-faint)]">{s.icon}</span>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">
        <ViewHeader title={SECTIONS.find((s) => s.id === section)?.label ?? "Settings"} description="Workspace-level configuration" />
        <div className="px-6 py-6">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex flex-col gap-6 max-w-2xl"
          >
            {section === "general" && <GeneralSection />}
            {section === "members" && <MembersSection />}
            {section === "security" && <SecuritySection />}
            {section === "issues" && <IssuesSection />}
            {section === "cycles" && <CyclesSection />}
            {section === "ai" && <AISection />}
            {section === "integrations" && <IntegrationsSection />}
            {section === "billing" && <BillingSection />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[var(--color-border)] py-4">
      <div>
        <div className="text-[13px] font-medium text-[var(--color-text)]">{title}</div>
        <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  const [on, setOn] = React.useState(defaultChecked ?? false);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      role="switch"
      aria-checked={on}
      className={cn(
        "relative h-5 w-9 rounded-full border border-[var(--color-border)] transition-colors",
        on ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-2)]",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 600, damping: 36 }}
        className={cn("absolute top-0.5 size-3.5 rounded-full bg-white", on ? "right-0.5" : "left-0.5")}
      />
    </button>
  );
}

function FieldInput({ defaultValue, width = "w-48" }: { defaultValue: string; width?: string }) {
  return (
    <input
      defaultValue={defaultValue}
      className={cn("h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-border-strong)]", width)}
    />
  );
}

function GeneralSection() {
  return (
    <Card title="General" subtitle="Identity and visibility">
      <SettingRow title="Workspace name" description="Used in URLs, emails, and notifications">
        <FieldInput defaultValue="rejira" />
      </SettingRow>
      <SettingRow title="Workspace URL" description="A unique identifier for your team">
        <div className="flex h-7 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] text-[var(--color-text-muted)]">
          rejira.app/
        </div>
      </SettingRow>
      <SettingRow title="Logo" description="PNG, JPG, or SVG. 4:1 aspect ratio recommended.">
        <div className="grid size-9 place-items-center rounded-md bg-[oklch(0.72_0.18_40)] text-[14px] font-bold text-[oklch(0.16_0.005_250)]">⏣</div>
      </SettingRow>
      <SettingRow title="Time zone" description="All times are shown in this zone by default">
        <FieldInput defaultValue="Europe/Berlin" width="w-44" />
      </SettingRow>
    </Card>
  );
}

function MembersSection() {
  return (
    <Card title="Members" subtitle="12 people in this workspace">
      <div className="overflow-hidden rounded-md border border-[var(--color-border)]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-left text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Last active</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Aria Wen", role: "Admin", last: "2 min ago" },
              { name: "Kenji Park", role: "Member", last: "1 h ago" },
              { name: "Maya Okafor", role: "Member", last: "Yesterday" },
              { name: "Sven Larsson", role: "Member", last: "3 d ago" },
            ].map((m) => (
              <tr key={m.name} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-1)]">
                <td className="px-3 py-2 text-[var(--color-text)]">{m.name}</td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{m.role}</td>
                <td className="px-3 py-2 text-[var(--color-text-faint)]">{m.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SecuritySection() {
  return (
    <Card title="Security" subtitle="Authentication and access control">
      <SettingRow title="Two-factor authentication" description="Require 2FA for all members">
        <Toggle defaultChecked />
      </SettingRow>
      <SettingRow title="SAML SSO" description="Single sign-on for enterprise plans">
        <Toggle />
      </SettingRow>
      <SettingRow title="IP allowlist" description="Restrict workspace access to specific IPs">
        <FieldInput defaultValue="—" />
      </SettingRow>
    </Card>
  );
}

function IssuesSection() {
  return (
    <Card title="Issues" subtitle="Defaults and workflow">
      <SettingRow title="Default status for new issues" description="Used when creating via API or templates">
        <FieldInput defaultValue="Todo" width="w-32" />
      </SettingRow>
      <SettingRow title="Estimate scale" description="0, 1, 2, 3, 5, 8, 13, 21 — Fibonacci">
        <Toggle defaultChecked />
      </SettingRow>
      <SettingRow title="Auto-close on PR merge" description="When all issues are linked, close them automatically">
        <Toggle defaultChecked />
      </SettingRow>
    </Card>
  );
}

function CyclesSection() {
  return (
    <Card title="Cycles" subtitle="Sprint cadence and behavior">
      <SettingRow title="Default cycle length" description="Apply to new projects">
        <FieldInput defaultValue="2 weeks" width="w-32" />
      </SettingRow>
      <SettingRow title="Auto-start next cycle" description="Begin a new cycle immediately when one ends">
        <Toggle defaultChecked />
      </SettingRow>
    </Card>
  );
}

function AISection() {
  return (
    <Card title="AI" subtitle="Triage, summaries, and assistance">
      <SettingRow title="Triage suggestions" description="AI-suggested priority, assignee, and labels on new issues">
        <Toggle defaultChecked />
      </SettingRow>
      <SettingRow title="Stand-up summaries" description="Daily digest posted to Slack at 9:00 local time">
        <Toggle />
      </SettingRow>
      <SettingRow title="Auto-draft replies" description="Compose comment suggestions in the activity feed">
        <Toggle defaultChecked />
      </SettingRow>
    </Card>
  );
}

function IntegrationsSection() {
  const list = [
    { name: "GitHub", desc: "Link issues to PRs and branches", connected: true },
    { name: "Slack", desc: "Notifications in channels and DMs", connected: true },
    { name: "Figma", desc: "Embed designs in issue descriptions", connected: false },
    { name: "Sentry", desc: "Auto-create issues from exceptions", connected: false },
  ];
  return (
    <Card title="Integrations" subtitle="Connect external services">
      <ul className="divide-y divide-[var(--color-border)]">
        {list.map((i) => (
          <li key={i.name} className="flex items-center justify-between py-3">
            <div>
              <div className="text-[13px] font-medium text-[var(--color-text)]">{i.name}</div>
              <div className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{i.desc}</div>
            </div>
            {i.connected ? (
              <span className="flex items-center gap-1.5 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-2 py-0.5 text-[11px] text-[var(--color-success)]">
                <CheckIcon size={10} />
                Connected
              </span>
            ) : (
              <button className="flex h-6 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[11px] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]">
                Connect
                <ArrowUpRightIcon size={10} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BillingSection() {
  return (
    <Card title="Billing" subtitle="Plan and payment method">
      <SettingRow title="Current plan" description="Renews on July 6, 2026">
        <span className="rounded-md border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-2 py-1 text-[11px] text-[var(--color-text)]">Pro · $16 / user / mo</span>
      </SettingRow>
      <SettingRow title="Seats" description="12 active members">
        <FieldInput defaultValue="12" width="w-16" />
      </SettingRow>
      <SettingRow title="Payment method" description="Visa ending in 4242">
        <FieldInput defaultValue="•••• 4242" width="w-40" />
      </SettingRow>
    </Card>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">{title}</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">{subtitle}</p>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}
