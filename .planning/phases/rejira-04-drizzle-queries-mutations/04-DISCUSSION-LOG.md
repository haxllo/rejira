# Phase 4: Drizzle queries & mutations - Discussion Log

**Gathered:** 2026-06-08
**Mode:** discuss (default)
**Areas discussed:** 3 of 3 selected

---

## Area 1 — Org plugin ↔ Drizzle schema alignment

### Q1: Direction of conformance
- **Options presented:**
  - Conform Drizzle to org plugin (text ids, camelCase, text role)
  - Diverge — keep our schemas, customize the plugin with field-mappings
  - Hybrid — text id + camelCase, keep ENUM role
- **Selected:** Conform Drizzle to org plugin (text ids, camelCase, text role)
- **Rationale:** Only path that keeps the plugin as source of truth for org data.

### Q2: Id generation
- **Options presented:**
  - text nanoid generated in app code, passed to Drizzle insert
  - Postgres generate nanoid via extension (pg_idkit)
  - Keep bigserial as primary key, add text pluginId column alongside
- **Selected:** Postgres generate nanoid via extension (pg_idkit)
- **Rationale:** Less app-code surface, but needs a new migration to enable the extension.

### Q3: RLS role check
- **Options presented:**
  - JIT per-request claim → memberships lookup (membership-first)
  - Compute workspace membership once per JWT via custom claim
  - Postgres role per workspace, dynamic SET LOCAL inside transaction
- **Selected:** Postgres role per workspace, dynamic SET LOCAL inside transaction
- **Rationale:** Strongest isolation.

### Q4: Connection strategy (follow-up because pgBouncer can't hold role state)
- **Options presented:**
  - Route mutations through DIRECT_URL (session-mode 5432); reads stay on 6543
  - Run a second pooled Drizzle instance on session-mode Supavisor for writes
  - Drop per-workspace role model, use the membership-first approach instead
- **Selected:** Drop per-workspace role model, use the membership-first approach instead
- **Rationale:** Reverted Q3 to membership-first RLS. Three connection strings per env stay as in AGENTS.md. Q3 was revised mid-discussion to membership-first.

### Net decisions
- D-04-01: Conform Drizzle to plugin (text, camelCase, text role)
- D-04-02: pg_idkit extension generates nanoid server-side
- D-04-03 (revised): Membership-first RLS
- D-04-04 (revised): Rejected per-workspace role model

---

## Area 2 — Optimistic UI ↔ Realtime confirm contract

### Q1: Where does the optimistic copy live?
- **Options presented:**
  - RSC useOptimistic for server actions; client cache for direct fetches
  - Client-side optimistic slice keyed by mutation id, reconciled by Realtime
  - Hybrid: useOptimistic for writes, Realtime-echo for read state
- **Selected:** Hybrid: useOptimistic for writes, Realtime-echo for read state
- **Rationale:** Cleanest separation; matches AGENTS.md guidance.

### Q2: When does pending clear?
- **Options presented:**
  - Clear on HTTP 200 (server commit), ignore Realtime echo
  - Clear on Realtime echo with our mutation id (dedupe by client correlation id)
  - Clear on HTTP 200, reconcile read state on Realtime echo (treats its own write as a no-op)
- **Selected:** Clear on Realtime echo with our mutation id (dedupe by client correlation id)
- **Rationale:** Read state and optimistic copy never disagree.

### Q3: Realtime gap handling
- **Options presented:**
  - Optimistic state stays; surface a 'syncing' indicator; reconcile on echo or hard refresh
  - Optimistic state stays for 10s, then fires a stale-mutation reconciler (refetch + drop)
  - HTTP 200 short-circuits the echo wait after 5s; show a 'unconfirmed' badge on the row
- **Selected:** HTTP 200 short-circuits the echo wait after 5s; show a 'unconfirmed' badge on the row
- **Rationale:** Best for production safety.

### Q4: Toast undo semantics
- **Options presented:**
  - Undo issues a new Drizzle mutation (compensating) and clears pending on its own echo
  - Undo is forbidden after the server has committed; toast hides it
  - Undo allowed within 5s of echo via a 'soft' compensating mutation
- **Selected:** Undo allowed within 5s of echo via a 'soft' compensating mutation
- **Rationale:** Pragmatic; matches Linear's UX. Risky actions opt into 30s retention via `undoWindowMs`.

### Net decisions
- D-04-05: Hybrid optimistic model
- D-04-06: Pending clears on Realtime echo with correlation-id dedupe
- D-04-07: 5s HTTP-200 short-circuit + unconfirmed badge
- D-04-08: 5s soft-compensating-undo (30s for risky actions via `undoWindowMs`)

---

## Area 3 — Realtime query ownership & derived data

### Q1: Where does derived data live?
- **Options presented:**
  - Client subscribes to base tables, re-runs Drizzle queries on change
  - Server-materialized Postgres views + triggers, Realtime subscribes to the views
  - Composite — base-table subscription for read state, server-aggregated tables (denormalized counters) for badges
- **Selected:** Composite — base-table subscription for read state, server-aggregated tables (denormalized counters) for badges
- **Rationale:** Best of both: row-level freshness for lists, single-row updates for counters.

### Q2: Channel model (initial)
- **User said:** "choose whats best and robust"
- **OpenCode presented a 3-option trade-off:**
  - One channel per workspace (Recommended)
  - Per-query channels (more flexible, more overhead)
  - Hybrid: primary + ephemeral derived
- **Selected:** One channel per workspace (Recommended)
- **Rationale:** Simplest, most robust, matches AGENTS.md "WebSocket subscription per workspace".

### Q3: Cross-workspace aggregates
- **Options presented:**
  - Per-workspace channel counts the user has access to, summed client-side
  - Single user channel (`user_<id>`) carries a pre-aggregated unread count
  - Top-bar polls the unread endpoint every 30s as a fallback
- **Selected:** Per-workspace channel counts the user has access to, summed client-side
- **Rationale:** Fits the per-workspace channel model, no new surface area.

### Net decisions
- D-04-09: Composite realtime model (base tables + denormalized counters)
- D-04-10: One channel per workspace
- D-04-11: Cross-workspace aggregates via per-workspace subscriptions summed client-side

---

## Deferred Ideas

- Realtime message coalescing/throttling — implement in plan
- Reconnect reconciliation for offline clients — implement in plan
- User presence sharing the workspace channel (Phase 5) — out of Phase 4 scope
- Saved view URL encoding — implementation detail for the planner
- Inbox notification source-of-event (transaction vs. async queue) — planner call
- Phase 5 Yjs description CRDT — confirmed out of Phase 4 scope
- Custom fields per workspace — post-GA per PROJECT.md

---

*Discussion gathered: 2026-06-08*
