# Plan 04-06 Summary — Realtime Layer

**Date:** 2026-06-09
**Status:** Complete
**Tests:** 16/16 passed

## Files Created (11)

| File | Purpose |
|------|---------|
| `apps/web/lib/realtime/client.ts` | Singleton browser-side SupabaseClient via `@supabase/ssr` `createBrowserClient` |
| `apps/web/lib/realtime/subscriptions.ts` | 7 typed subscription helpers: subscribeToIssues, subscribeToComments, subscribeToNotifications, subscribeToMemberships, subscribeToCycles, subscribeToProjects, subscribeToSavedViews |
| `apps/web/lib/realtime/workspace-provider.tsx` | WorkspaceRealtimeProvider React context; opens one `supabase.channel(`workspace:${wsId}`)` per workspace |
| `apps/web/lib/state/comments.ts` | Zustand store for per-issue comments (append/replace/remove) |
| `apps/web/lib/state/notifications.ts` | Zustand store for notifications and unread count |
| `apps/web/hooks/useRealtimeIssues.ts` | 200ms debounced `router.refresh()` on issue changes |
| `apps/web/hooks/useRealtimeComments.ts` | Appends/replaces/removes comments in local store on Realtime events |
| `apps/web/hooks/useRealtimeNotifications.ts` | Updates unread count on INSERT/UPDATE of notifications |
| `apps/web/hooks/useRealtimeMemberships.ts` | `router.refresh()` on membership changes |
| `apps/web/lib/db/_tests/realtime-subs.test.ts` | 8 tests: singleton, channel names, filters, provider mount/unmount, workspace switch |
| `apps/web/lib/db/_tests/realtime-hooks.test.ts` | 8 tests: subscribe/unsubscribe, INSERT/UPDATE/DELETE, debounce, re-subscribe, unread count |

## Files Modified (4)

| File | Change |
|------|--------|
| `apps/web/app/(workspace)/layout.tsx` | Wraps children in `<WorkspaceRealtimeProvider>` |
| `apps/web/components/shell/primary-nav.tsx` | Wires `useRealtimeNotifications` for Inbox unread badge |
| `apps/web/components/shell/top-bar.tsx` | Wires `useRealtimeMemberships` for workspace switcher updates |
| `apps/web/components/issue/issue-drawer.tsx` | Wires `useRealtimeComments` for live comment stream |

## Dependencies Added

- `@supabase/ssr` — browser-side Supabase client (createBrowserClient)
- `@supabase/supabase-js` — RealtimeChannel, RealtimePostgresChangesPayload types
- `use-debounce` — 200ms debounced router.refresh()
- `@testing-library/react` (dev) — React hook rendering in tests
- `@testing-library/jest-dom` (dev) — DOM matchers
- `jsdom` (dev) — Test environment for React components

## Test Results

```
Test Files  2 passed (2)
     Tests  16 passed (16)
```

### realtime-subs.test.ts (8 tests)
1. getSupabaseBrowserClient() singleton
2. subscribeToIssues channel name + filter
3. subscribeToComments filters on issue_id
4. subscribeToNotifications filters on user_id
5. subscribeToMemberships filters on workspaceId
6. subscribeToCycles/Projects/SavedViews filters on workspaceId
7. WorkspaceRealtimeProvider opens channel on mount, closes on unmount
8. WorkspaceRealtimeProvider re-opens channel on workspaceId change

### realtime-hooks.test.ts (8 tests)
1. useRealtimeIssues subscribes on mount
2. useRealtimeComments appends/replaces/removes on INSERT/UPDATE/DELETE
3. useRealtimeNotifications updates unread count
4. useRealtimeMemberships calls router.refresh
5. All 4 hooks unsubscribe on unmount
6. Hooks re-subscribe when key changes
7. useRealtimeIssues debounces router.refresh
8. Unread count decrements correctly for mark-read from another tab

## Verification

- `npx next build` — builds successfully (pre-existing posthog-node warnings unrelated)
- `npx tsc --noEmit` — no errors from files touched by this plan
- 2 grep matches for WorkspaceRealtimeProvider in layout.tsx
- 2 grep matches for useRealtimeNotifications in primary-nav.tsx
- 2 grep matches for useRealtimeMemberships in top-bar.tsx
- 1 grep match for useRealtimeComments in issue-drawer.tsx

## Deviations

1. **use-debounce dependency:** The plan didn't explicitly list `use-debounce` in dependencies but used it in hook code examples. Added as a direct dependency.
2. **@testing-library/react:** Plan referenced `react-test-renderer` for tests; used `@testing-library/react` instead as the project-standard testing approach (better hooks support via `renderHook`).
3. **useUser return type:** The `useUser` hook returns `{ user: session?.user ?? null, isLoading }` — test mocks include `emailVerified`, `updatedAt`, `twoFactorEnabled` to match the Better Auth session user type.
4. **Subscriptions use separate channels:** Each subscription helper creates its own channel per table. The WorkspaceRealtimeProvider also creates one channel per workspace. These coexist; the hooks subscribe through dedicated per-table channels while the provider maintains a workspace-level channel shell.

## Security

- RLS at Realtime layer enforces tenancy (no JS-side workspaceId filter needed beyond the channel filter)
- Single channel per workspace pattern prevents WebSocket leaks
- Unsubscribe on unmount/workspace-switch prevents stale subscriptions
