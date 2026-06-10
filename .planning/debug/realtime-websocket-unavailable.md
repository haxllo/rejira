---
status: resolved
trigger: 'Uncaught Error: WebSocket not available:' at subscribeToTable (lib/realtime/subscriptions.ts:37)
created: 2026-06-10
updated: 2026-06-10
tdd_checkpoint: false
---

## Resolution

**Root cause:** Firefox's cross-origin WebSocket security policy. The app was served from `http://localhost:3000` but Supabase URL was `http://127.0.0.1:54321`. Even though both resolve to the same machine, Firefox treats `localhost` and `127.0.0.1` as different origins and blocks WebSocket connections between them with `NS_ERROR_CONTENT_BLOCKED`. The `DOMException` has `message: ''` (empty string), which caused the cryptic "WebSocket not available:" log in the catch block.

**Fix:** Two-part resolution:

1. **Root cause:** Firefox's Enhanced Tracking Protection blocks WebSocket connections from `http://localhost:3000` to `ws://localhost:54321` on non-standard ports, throwing `NS_ERROR_CONTENT_BLOCKED` synchronously in the WebSocket constructor. Changing from `127.0.0.1` to `localhost` did NOT resolve this — Firefox still blocks non-443 WebSocket from HTTP pages.

2. **Graceful degradation:** Wrapped both `subscribeToTable()` and `WorkspaceRealtimeProvider`'s `.subscribe()` calls in try/catch blocks. When Realtime is unavailable (Firefox, network issues, etc.), the app degrades gracefully — no live updates, but no crash.

3. **Zustand infinite loop fix:** Applied `useShallow` to `useProjectsStore` and `useUsersStore` selectors in `create-issue-dialog.tsx` — same pattern as `primary-nav.tsx` and `command-palette.tsx`. The `Object.values()` calls created new references on every render, causing React to re-render infinitely.

**Note:** In production with Supabase Cloud (HTTPS page, WSS to `*.supabase.co`), Firefox will not block the WebSocket connection. This is a local dev-only issue.

## Symptoms

**Expected behavior:** Realtime subscription connects via WebSocket and receives Postgres changes.

**Actual behavior:** `subscribe()` throws `Error: WebSocket not available:` in browser console. Realtime does not work.

## Evidence

- timestamp: 2026-06-10
  finding: Debug logs revealed `NS_ERROR_CONTENT_BLOCKED` thrown from `new this.transport(this.endPointURL(), protocols)` in `transportConnect()`. Error name = `NS_ERROR_CONTENT_BLOCKED`, message = `` (empty string), constructor = `Object` (Firefox DOMException).

- timestamp: 2026-06-10
  finding: URL was `ws://127.0.0.1:54321/realtime/v1/websocket?...` while page origin was `http://localhost:3000`.
