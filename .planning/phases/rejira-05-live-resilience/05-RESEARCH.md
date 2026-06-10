# Phase 5: Live & resilience — Research

**Compiled:** 2026-06-10
**Status:** Ready for planning
**Source:** gsd-phase-researcher (inline research)

## Yjs + Supabase Realtime Broadcast

### Key finding
The community package `@supabase-labs/y-supabase` (v0.1.0, published 2026-03-11) provides a ready-made Yjs connection provider that bridges Yjs documents with Supabase Realtime Broadcast.

**Repository:** https://github.com/supabase-community/y-supabase  
**npm:** `@supabase-labs/y-supabase`  

### Architecture
```
Y.Doc ←→ SupabaseProvider ←→ Supabase Realtime (Broadcast)
         ↓
    SupabasePersistence ←→ Postgres table (yjs_documents)
```

### Usage pattern
```ts
import * as Y from 'yjs';
import { createClient } from '@supabase/supabase-js';
import { SupabaseProvider } from '@supabase-labs/y-supabase';

const doc = new Y.Doc();
const supabase = getSupabaseBrowserClient();
const provider = new SupabaseProvider('issue:DESC-123', doc, supabase, {
  awareness: true,     // cursor/presence tracking
  persistence: true,   // save to Postgres
});

// Get the shared text type
const yText = doc.getText('description');

// Awareness for presence/cursors
const awareness = provider.getAwareness()!;
awareness.setLocalStateField('user', { name, color });
```

### Integration points
- Works alongside the existing `WorkspaceRealtimeProvider` (separate channel per issue description)
- Persistence requires a `yjs_documents` table (`room text PK, state text`)
- Since Yjs syncs binary state via Broadcast, no server-side relay is needed — peer-to-peer over Supabase
- For Tiptap/ProseMirror: use `y-prosemirror` binding or direct `Y.Text` → textarea binding

### Decision
**Use `@supabase-labs/y-supabase`** (not raw Broadcast) — it handles the Yjs↔Broadcast bridge, awareness cleanup, reconnection, and persistence. Fall back to custom Broadcast logic only if the package has breaking issues.

---

## Supabase Realtime Presence

### Documentation
https://supabase.com/docs/guides/realtime/presence

### How it works
Presence lets each connected client publish a small state payload (JSON) to a shared channel. Events:
- `sync` — full presence state updated (replace local mirror)
- `join` — new client appeared
- `leave` — client disconnected

### Code pattern (already uses same channel infra)
```ts
const channel = supabase.channel(`workspace:${workspaceId}`);

// Track user presence
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      userId: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      currentIssueId: issueId, // what they're viewing
      onlineAt: new Date().toISOString(),
    });
  }
});

// Listen for presence changes
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  // state = { 'client_key': [{ userId, name, ... }] }
});
```

### Integration into existing code
The existing `WorkspaceRealtimeProvider` already opens a `workspace:{wsId}` channel. Adding `.track()` and presence event handlers to this existing channel means **no new channels** — zero additional connection overhead.

---

## Supabase Realtime Postgres Changes (existing)

Already fully wired in Phase 4:
- `lib/realtime/client.ts` — Supabase browser client singleton
- `lib/realtime/subscriptions.ts` — `subscribeToIssues()`, `subscribeToNotifications()`, etc.
- `lib/realtime/workspace-provider.tsx` — Provider with empty `() => {}` stubs
- `hooks/useRealtimeIssues.ts` — 200ms debounced `router.refresh()`
- `hooks/useRealtimeNotifications.ts` — Updates local unread count via Zustand

**Phase 5 work needed:** Wire the stubs in `workspace-provider.tsx` to dispatch changes to the appropriate Zustand stores and trigger `router.refresh()`.

---

## Next.js Error Boundaries

### File conventions
Next.js App Router provides built-in error boundary files:
- `app/error.tsx` — catches errors in Server Components
- `app/(workspace)/error.tsx` — catch errors within workspace routes

### Pattern
```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Custom error boundaries
For page-level granularity, wrap sections in client components that implement `componentDidCatch`. Sentry's `@sentry/nextjs` provides `<Sentry.ErrorBoundary>` which captures errors and shows a fallback UI.

### Work needed
- Root `app/error.tsx` — generic catch-all with retry
- Workspace `app/(workspace)/error.tsx` — workspace-aware error with retry
- Optional: Sentry `<ErrorBoundary>` wrappers around issue drawer, inbox, search

---

## Sentry + PostHog telemetry

### Current state
- `@sentry/nextjs` ^10.57.0 installed
- `lib/observability/sentry.ts` — `initSentry()`, `captureError()`, `withSentryTransaction()`, `captureDrizzleError()`
- `lib/observability/posthog.ts` — `initPostHog()`, `trackEvent()`
- `lib/observability/auth-events.ts` — auth funnel events
- `lib/observability/logger.ts` — pino structured logger
- `lib/observability/drizzle-logger.ts` — Drizzle query logger

### What's missing
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` — these are created by `npx @sentry/wizard` and configure source maps, performance tracing, and replay
- Error boundaries with Sentry capture
- Sentry alerting rules (configured in sentry dashboard, not code)
- PostHog high-funnel mutation events (beyond auth)

### Work needed
- Run Sentry wizard or create config files manually
- Add Sentry error boundary to layout
- Wire PostHog tracking for issue create/update/comment events

---

## Mobile & Responsive Design

### Approach
The app uses Tailwind breakpoints. Current layouts are desktop-first.
- `sm:` (640px), `md:` (768px), `lg:` (1024px) breakpoints available
- PrimaryNav becomes a hamburger menu on mobile
- TopBar needs responsive compaction
- Issue list needs single-column layout on narrow screens
- Drawer goes full-screen on mobile (sheet from bottom)

### Testing
- iOS Safari 17+ — test via Safari dev tools or physical device
- Android Chrome latest — test via Chrome dev tools device emulation
- Viewport range: 375px (iPhone SE) to 1920px

---

## Transactional Emails

### Current state
- `lib/email/transport.ts` — dual transport (Resend / ConsoleTransport)
- `lib/email/templates/` — auth-only templates (welcome, verify, magic link, reset password, invite, role change, new device, password changed)
- `lib/email/bounce-handler.ts` — Resend webhook verification
- `lib/email/i18n.ts` — multi-locale support
- `lib/email/render.ts` — React Email rendering

### What's needed
- Issue assignment notification template
- @-mention notification template
- Status change notification template
- Comment notification template
- Unsubscribe link handling (list-unsubscribe header + preference page)

---

## Activity Log

### Current state
- `app/(workspace)/projects/[key]/activity/page.tsx` — renders activity feed
- `components/activity/activity-feed.tsx` — timeline-style activity display
- `lib/db/rsc.ts` — `getRecentActivities()` and `getActivitiesForObject()` already implemented
- Phase 2 triggers already write `tg_emit_activity()` on every mutation

### What's needed
- Workspace-level activity page (at `/activity`)
- Cycle-level activity tab
- Possibly richer activity rendering (before/after diffs, detailed descriptions)

---

## Security headers & rate limiting

**Status: Already complete** (SEC-07 ✅, SEC-08 ✅)
- `middleware.ts` has CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Rate limiting via Upstash Redis (configured in Phase 3)
- No additional work needed in Phase 5 — these were delivered in Phase 3

---

## Requirements mapping

| Req ID | Description | Phase 5 Coverage | Status |
|--------|------------|------------------|--------|
| REALT-01 | Issue updates <1s via Realtime | 05-01 | New |
| REALT-02 | Presence avatars in drawer | 05-01 | New |
| REALT-03 | Yjs collab on descriptions | 05-03 | New |
| REALT-04 | Inbox streams notifications | 05-02 | New |
| INBOX-04 | Mark all as read | 05-02 | New |
| INBOX-05 | Unread count badge in PrimaryNav | 05-02 | New |
| ACT-05 | Project activity page | 05-09 | Partial (page exists) |
| SEC-07 | Security headers | Already done in Phase 3 | ✅ Complete |
| SEC-08 | Rate limiting | Already done in Phase 3 | ✅ Complete |
| FILE-04 | Image inline preview | Phase 7 | Deferred |
| FILE-05 | PDF inline preview | Phase 7 | Deferred |

## Key Technology Decisions

1. **Yjs provider**: `@supabase-labs/y-supabase` v0.1.0 — community provider. If unreliable, fall back to `y-websocket` with a tiny WebSocket relay.
2. **Presence**: Native Supabase Realtime `.track()` on the existing workspace channel — zero additional channels.
3. **Error boundaries**: Next.js App Router `error.tsx` convention + Sentry `<ErrorBoundary>` wrappers.
4. **CSP**: Already set in middleware — no changes needed.
5. **Rate limiting**: Already configured via Upstash Redis.
6. **Email**: Extend existing template system with issue-event templates; Resend in production.
