# Jira Pain Points → Design Decisions (v2)

> Each pain point is mapped to **the specific layer that solves it** and **the concrete UX decision** that implements the fix. No hand-waving.

---

## P1 — Complexity & steep learning curve

| Pain | Decision | Layer |
|---|---|---|
| Overwhelming interface with too many options | **Progressive disclosure.** Default workspace shows 5 sections (Inbox, My Issues, Projects, Views, Settings). Everything else is opt-in. | L1 |
| Complex customization requires admin expertise | **Opinionated defaults + AI suggestions.** Creating a project picks a workflow template; AI (L10) suggests labels, assignees, due dates. | L4, L10 |
| JQL has learning barrier | **Typed filter AST in UI.** Click filters build a `where` clause; URL is the source of truth. Power users can paste JQL-like strings that compile to the same AST. | L2 (URL), L3, L8 |
| First-time users struggle with navigation | **Command palette is the navigation surface.** `⌘K` opens it by default on first login; 4-second onboarding tour. | L1, L2 |
| Two default views: "Inbox" and "My Issues" replace "Dashboard" and "Boards list" | L1 |

---

## P2 — Performance

| Pain | Decision | Layer |
|---|---|---|
| Slow loading times with large datasets | **Cursor pagination, virtualized lists, partial hydration.** Issue list is server-rendered with React Server Components; only row controls hydrate. | L1, L3, L5 |
| Page refreshes for nearly every action | **Optimistic mutations, no route changes for issue edits.** All issue updates happen in the drawer; the URL updates silently. | L2 |
| Laggy UI interactions in cloud version | **TanStack Query with stale-while-revalidate + background refetch.** Reads never block the UI. | L2 |
| Reports dashboard loading is sluggish | **Pre-computed aggregations** in a denormalized table, refreshed by a worker (L12). First paint is always <100 ms. | L12, L13 |
| Cold-start slowness on dev | **Turbopack for dev**, **React Compiler for memoization**, no barrel files. | L1 |

---

## P3 — UI/UX design

| Pain | Decision | Layer |
|---|---|---|
| Outdated interface (pre-2020s aesthetics) | **Editorial typography (Söhne-style sans + Geist Mono), 8-pt grid, OKLCH color tokens, motion = physics springs (no easings).** | L1 |
| Cluttered screens with information overload | **Density modes** (Compact / Default / Roomy) per user, per view. Issue list is row-only by default; details live in a right-side drawer. | L1 |
| Inconsistent design patterns across features | **One design system, one icon set** (`@animate-ui/icons`). No mixing. | L1 |
| Mobile experience lags behind desktop | **Mobile-first layouts** in App Router with `md:` and `lg:` breakpoints. Touch targets ≥44px. Bottom nav on `<md`. | L1 |
| The interface feels heavy | **`<200ms` perceived interaction time** budget. Every interaction either completes instantly or shows a skeleton within 16ms. | L1, L2 |

---

## P4 — Configuration overhead

| Pain | Decision | Layer |
|---|---|---|
| Extensive setup required for basic use | **3 workflow templates** (Software, Marketing, Operations). Pick one; ship. | L4 |
| Workflows, screens, fields need manual config | **Sensible defaults**: status set (Backlog → Todo → In Progress → In Review → Done), labels, assignees, due dates. Hideable, not removable. | L4 |
| Permission schemes are overly complicated | **3 base roles** (Admin / Member / Guest) + per-project overrides. Per-issue visibility (Public / Project / Private). | L6 |
| Custom field proliferation | **Typed property system**: `Issue.metadata jsonb` validated by a per-project Zod schema. New fields appear in a typed picker. | L4, L5 |
| Adding a team member takes 5 clicks | **Magic link by email, role picker, done in 1 dialog.** | L6 |

---

## P5 — Reporting & analytics

| Pain | Decision | Layer |
|---|---|---|
| Limited out-of-box meaningful metrics | **Built-in insights**: cycle time, throughput, WIP age, scope creep. On the Inbox as a daily digest. | L10, L12 |
| Dashboard creation requires technical knowledge | **No dashboards. One "Insights" tab in each project**, with 4 mandatory charts and 2 user-saved. | L4 |
| Pre-built reports insufficient | **AI-summarized weekly report** posted to Inbox with charts and a TL;DR. | L10 |
| Data visualization options are basic | **D3 for bespoke charts**, **Recharts** for standard, all themed via tokens. | L1 |
| Velocity is a magic number | **Cycle view shows planned vs actual** with burndown drawn live. | L4, L7 |

---

## P6 — Collaboration & communication

| Pain | Decision | Layer |
|---|---|---|
| Comments and notifications are noisy | **Per-event, per-channel preferences**. Inbox is always-on; email opt-in. Snooze any item for N hours. | L9 |
| No real-time collaboration | **Live presence, live editing, instant comment delivery** via Socket.io. | L7 |
| Status update friction (too many clicks) | **Status is a one-keystroke action** (`1` Backlog, `2` Todo, `3` In Progress, …). Animates optimistically. | L2 |
| Context switching between tools | **In-app inbox + GitHub + Slack are first-class.** Issue context shows linked PRs, Figma frames, Slack threads. | L11, L7 |
| Threads are flat in Jira | **Threaded comments with @mentions, reactions, internal-only mode.** | L4 |
| "What changed?" is hidden | **Activity tab on every issue**: who did what, when, with a diff for description edits. | L4, L13 |

---

## P7 — Pricing (out of scope for design, in scope for product)

- We do **not** build per-user pricing into the UI. All role/permission language avoids "seat" framing.
- Audit + compliance are platform features, not enterprise upsells. (See L13.)

---

## How we measure success

| Metric | Target | How measured |
|---|---|---|
| Time to first issue created (new user) | < 60 s | Telemetry (L13) |
| Median interaction latency (p50) | < 100 ms | RUM (L13) |
| 95th-percentile interaction latency (p95) | < 200 ms | RUM |
| LCP (issue list, 1000 issues) | < 1.5 s | Lighthouse |
| Daily active users who use the command palette | > 60 % | Telemetry |
| Notification "mute" actions per user per week | > 2 (means controls are visible) | Telemetry |
| Support tickets about "where is X" | < 1 per 100 MAU | Support tool |

---

## What this doc is **not**

- A list of feature ideas. Every pain point has a specific owner layer and a specific decision.
- A roadmap with dates. That's `PLAN.md`.
- A marketing comparison. That's external.
