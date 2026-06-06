# Phase 1 — Interactions

**Status:** not started
**Owner:** —
**Goal:** Make the prototype feel like a real product. Every state change must feel instant, every view must be shareable, and every list must respect the user's hand.

The current prototype is a static, in-memory mock. Phase 1 turns it into something that responds to intent: status flips instantly, filters live in the URL, rows drag to reorder, cards drag to change status, and the user's hand never has to wait for a paint.

---

## Scope summary (from `PLAN.md`)

> Phase 1 — Interactions
> - Optimistic mutations with rollback
> - URL-synced filters (group, sort, status, assignee, label, priority, due)
> - Density toggle (Compact / Default / Roomy)
> - Drag-to-reorder on lists; drag-to-change-status on board

**Plus what is implied but not yet done:**
- Wire the `Shift+D` density cycle shortcut to UI feedback (a chip in the status bar that flashes on change)
- Multi-select + bulk action menu (the foundation of every list operation, and a prerequisite for several of the above)
- Toast undo window: 5s expiry, count-down ring, click-to-undo anywhere on the toast
- Loading / error / retry states for every optimistic mutation
- Persist custom views to local storage (so URL state survives reload)

---

## What is already in place

| Surface | State |
|---|---|
| `useUI` Zustand store with `density`, `commandOpen`, `drawerIssueId`, `selectedIssueIds`, `groupBy`, `sortKey`, `sortDir`, `createIssueOpen`, `cheatsheetOpen` | ✅ |
| `useIssues` Zustand store with `setStatus`, `setPriority`, `toggleAssignee`, `undo` + `HISTORY` map | ✅ |
| `useChangeStatus` hook that fires `jira:toast` CustomEvent with Undo | ✅ |
| Global keyboard handler: `⌘K`, `/`, `C`, `?`, `Esc`, `g i|m|h|p|c|s|v`, `Shift+D`, `1`–`5` (in row context) | ✅ |
| Density CSS variables in `globals.css` (`--row-h`, `--font-size-base`, `--row-pad-y`, etc.) gated by `html[data-density="compact|default|roomy"]` | ✅ |
| `AnimatePresence` + `motion.button layout` already used on board cards and filter chips | ✅ |
| `FilterChips` component with layout-animated chips, add/remove | ✅ (no real filters wired) |
| `GroupedList` with collapsible sections, sticky group header | ✅ |

**Known gap to fix early in Phase 1:** `command-palette` had a backdrop-blur delay (the backdrop was a child of an opacity-animated parent; browsers defer `backdrop-filter` when the ancestor is `opacity: 0`). Fix: collapse the backdrop into the same `motion.div` that animates opacity, mirroring the cheatsheet pattern. (Done in this commit, verification pending user.)

---

## Workstreams

The work splits cleanly into five streams. **Stream 1A is the foundation — every other stream consumes its exports.** The other four can be parallelised after 1A lands.

```
                    ┌──────────────────────────┐
                    │  1A  Optimistic mutation  │
                    │      engine + toasts      │
                    └────────────┬─────────────┘
                                 │ exports: addIssue, setStatus,
                                 │          setPriority, toggleAssignee,
                                 │          moveToStatus, reorderIssues,
                                 │          archiveIssue, bulk* …
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │  1B  URL-synced  │ │  1D  Drag to     │ │  1E  Drag to     │
   │       filters    │ │  reorder (list)  │ │  change status   │
   │                  │ │                  │ │  (board)         │
   └──────────────────┘ └──────────────────┘ └──────────────────┘
                                 ▲
                                 │
                    ┌────────────┴─────────────┐
                    │  1C  Density toggle      │
                    │      (polish + status    │
                    │       bar indicator)     │
                    └──────────────────────────┘
```

A sixth stream — **1F Multi-select + bulk actions** — is treated as a separate vertical because it touches every list view, but it depends on 1A only.

---

### 1A — Optimistic mutation engine  *(foundation, blocks everything)*

**Why first:** Every drag, every filter-driven URL change, every bulk action ultimately mutates `useIssues`. We need a single, consistent mutation pipeline before any of those surfaces can be built.

**Current state:** `setStatus`, `setPriority`, `toggleAssignee` exist. `undo()` pops the last entry from a per-issue `HISTORY` map. `useChangeStatus` is the only public mutation wrapper, and it fires a `jira:toast` CustomEvent for the global `Toast` component to pick up.

**What's missing:**

| Need | Why |
|---|---|
| `addIssue(input: IssueInput): string` | Create dialog + "Add issue" group buttons need to mutate and return the new ID (optimistic, with `i_*` prefix until "saved") |
| `moveToStatus(id, status)` | Distinguish from `setStatus` because board drop should also reorder within column |
| `reorderIssues(groupId, fromIdx, toIdx)` | Drag-to-reorder needs to update the implicit position field on `Issue` |
| `archiveIssue(id)` / `unarchiveIssue(id)` | Multi-select and the issue drawer's archive action |
| `bulkSetStatus(ids, status)`, `bulkAssign(ids, userId)`, `bulkAddLabel(ids, labelId)`, `bulkArchive(ids)` | Multi-select requires atomic multi-mutation with a single undo |
| `setTitle(id, title)`, `setDescription(id, desc)`, `setDueDate(id, date)`, `setEstimate(id, points)` | Drawer inline-edit already has these UI affordances but no state plumbing |
| `pending: Set<string>` per-issue flag | Show a subtle pulse on the row / card for the brief "saving" window. (In the mock, this window is 0ms, but the UI must support it.) |
| `lastError: { id, op, message } \| null` | Failed mutations surface a "Retry" action in the toast |
| Stable selection across status changes | When `setStatus` runs on a selected issue, it should stay selected (currently `useIssues.issues` is replaced by `issues.map`, which preserves identity on the unchanged entries — good — but a future `splice` rewrite would break this) |

**The mutation pipeline (target shape):**

```ts
// lib/state/mutations.ts
type MutationContext = {
  issue: Issue;          // pre-mutation snapshot
  op: string;            // human-readable: "Moved to In Progress"
  undo: () => void;      // closure that reverts the issue
  retry: () => void;     // closure that re-runs the mutation
};

function apply(ctx: MutationContext): void;   // writes to store, fires toast
```

`apply()`:
1. Pushes `ctx` onto a global `STACK` (for the next undo)
2. Calls `set(produce(...))` with the mutation
3. Sets `pending: true` on the affected issue IDs
4. Dispatches a `jira:toast` CustomEvent with `{ message, actionLabel: "Undo", expiresAt: Date.now()+5000, onAction: ctx.undo, onRetry: ctx.retry }`
5. In a real backend integration, would `await fetch(...)` and either clear `pending` on success or restore the previous state + set `lastError` on failure

In the mock, `set` is synchronous and `pending` is cleared on the next tick. The pipeline shape must work for a real backend later without changes to the call sites.

**Toast UX (already partially in `components/shell/toast.tsx`):**
- 5s auto-expire with a thin radial progress ring on the leading edge
- Count-down pauses on hover
- Click anywhere on the toast body to undo
- "Retry" pill appears if `lastError` is set
- Multiple toasts stack vertically with `layout` animation
- Max 3 visible; older toasts collapse into a "+ N more" chip

**Files to create / edit:**
- `apps/web/lib/state/issues.ts` — extend with new actions
- `apps/web/lib/state/mutations.ts` — new file: `apply()`, `STACK`, `MutationContext`
- `apps/web/components/shell/toast.tsx` — extend with progress ring, pause-on-hover, retry, stacking
- `apps/web/components/issue/issue-row.tsx` — add `pending` pulse on the row
- `apps/web/components/views/cycle-board.tsx` — add `pending` pulse on the card
- `apps/web/components/issue/issue-drawer.tsx` — wire `setTitle`, `setDescription`, `setDueDate`, `setEstimate` calls to `apply()` (the edit UI already exists; the mutation is the only missing piece)
- `apps/web/components/issue/create-issue-dialog.tsx` — wire `addIssue` to `apply()`

**Acceptance criteria:**
- Every existing `setStatus` / `setPriority` / `toggleAssignee` call site now goes through `apply()`
- Creating an issue appears instantly at the top of the relevant view (no reload)
- Status change via `1`–`5` key shows a 5s undo toast; pressing `Z` (or clicking the toast) reverts
- Archiving a row removes it from the list and shows an undo toast
- Bulk-archive of 5 issues is one undo

---

### 1B — URL-synced filters  *(depends on 1A)*

**Why now:** Filters that don't survive a page reload are filters users don't trust. The view page (`/views/[id]`) already has the concept of named views; URL params turn every filter combo into a shareable, bookmarkable address.

**Current state:** `views/[id]/page.tsx` hard-codes 4 view definitions with predicate functions in the file. `my-issues/page.tsx` has a static `FilterChips` array with no real filter logic. `groupBy` and `sortKey` live in `useUI` and are persisted to local storage, but they are not reflected in the URL.

**Filter grammar (target):**

```
/views/all?status=in_progress,in_review&assignee=me,u_alice&label=lbl_perf,lbl_regression
            &priority=urgent,high&due=overdue,this_week&search=cursor%20bug
            &group=status&sort=updated:desc
```

- Comma-separated multi-value for OR within a field
- Special tokens: `me` (current user), `none` (unassigned / no label / no due date), `overdue`, `this_week`, `next_week`
- `search` is a substring match on title + key + (optionally) description in Phase 2
- `group` and `sort` come from the existing `useUI` store; we re-export them through the URL

**Implementation:**

1. **`lib/state/view-query.ts`** — pure functions:
   - `parseSearchParams(params: URLSearchParams): FilterState`
   - `serializeFilterState(state: FilterState): URLSearchParams`
   - `defaultFilterState(id: ViewId): FilterState`  (the seed for each named view)
   - `applyFilter(state, issues): Issue[]` — pure, tested in isolation
   - `applyGroup(state, issues): Group[]` — pure, replaces the inline group loop in `views/[id]`

2. **`hooks/useViewQuery.ts`** — thin glue:
   - Reads `useSearchParams` and `usePathname`
   - Hydrates a local `useState<FilterState>` initialised from the URL on mount
   - On state change, `useDeferredValue(state)` and `router.replace(`${pathname}?${qs}`, { scroll: false })`
   - Returns `{ state, setState, replace }` so the view can wire the filter popover

3. **Refactor `views/[id]/page.tsx`** to consume `useViewQuery` instead of the inline `view.filter` predicate.

4. **Refactor `my-issues/page.tsx`** to seed its `FilterChips` from the URL state (status defaults to "Not Done" + assignee defaults to "Me", but both are user-editable).

5. **Refactor `projects/eng/issues/page.tsx`** to use the same hook — every project gets the same filter set; views become "saved filter combos" on top.

6. **Add a `FilterPopover`** — a real popover (Radix `Popover` + `cmdk` for the option list) attached to the "Add filter" button. It exposes Status, Assignee, Label, Priority, Due, and Search rows. Each row opens a multi-select list.

7. **Save-as-view**: when the user adjusts filters, the ViewHeader gets a "Save as view" button that posts the current `FilterState` into a `useSavedViews` Zustand store (persisted) and shows a confirmation toast.

**Files to create / edit:**
- `apps/web/lib/state/view-query.ts` — new
- `apps/web/hooks/useViewQuery.ts` — new
- `apps/web/lib/state/saved-views.ts` — new
- `apps/web/components/views/filter-popover.tsx` — new
- `apps/web/components/views/filter-chips.tsx` — extend chips to read from `FilterState`
- `apps/web/app/(workspace)/views/[id]/page.tsx` — refactor
- `apps/web/app/(workspace)/my-issues/page.tsx` — refactor
- `apps/web/app/(workspace)/projects/eng/issues/page.tsx` — refactor
- `apps/web/components/views/view-header.tsx` — add "Save as view" button

**Acceptance criteria:**
- `/views/all?status=in_progress&priority=urgent&sort=priority:asc` produces the same result on reload, on share, and on back-navigation
- Adjusting a filter in the popover updates the URL with no full page reload
- The "Active filters" chips reflect the current URL
- A user can save a filter combo, see it in `/views/all` as a saved view, and reload the page with that view selected
- `group` and `sort` are URL-persisted (currently they only live in local storage)

---

### 1C — Density toggle polish  *(independent, ships whenever)*

**Why:** The infrastructure is there but the experience isn't. `Shift+D` cycles density silently, which makes the user wonder whether anything happened. We need feedback, and we need density to survive navigation (it already does via `useUI.persist`, but we should also URL-persist it for the per-view experience).

**Tasks:**
1. **Status-bar indicator** — append a `Density: Default` chip to `components/shell/status-bar.tsx` that updates live on `Shift+D` and on click opens a 3-option menu (Compact / Default / Roomy). Highlight the active one with the layoutId pill.
2. **First-paint flash** — on density change, briefly animate the entire main column (8px slide + 200ms fade) so the user *feels* the change. (Only on the first toggle after a page is loaded — not on every shift.)
3. **Per-row `data-density` verification** — audit `globals.css` to ensure every row-height / font-size / padding token is density-driven, not hard-coded. Known candidates: `IssueRow` (height), `GroupedList` group header (height), `CycleBoard` card (padding), `Inbox` row (height), `TopBar` (height — should never change).
4. **URL persistence** — append `?density=compact` etc. so the density is per-link, not just per-device.
5. **Accessibility** — density change should not be a focus mover; only the chip in the status bar updates visually.

**Acceptance criteria:**
- `Shift+D` shows a brief radial flash on the status-bar chip and the entire list reflows visibly
- Reloading `/my-issues?density=compact` shows the compact rows from first paint
- The status-bar chip is keyboard-accessible (Tab → Enter → arrow keys to choose, Enter to commit)

---

### 1D — Drag to reorder (list views)  *(depends on 1A)*

**Why:** Lists where rows can't move feel like spreadsheets. The keyboard shortcut `1`–`5` for status is great, but the user should be able to grab a row and place it precisely. This is also the prerequisite for Phase 2 (where the new position persists server-side).

**Library:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (already in the Animate-UI / shadcn ecosystem we use). Tree-shakeable, headless, supports keyboard sensors, and is the standard for this kind of work.

**Tasks:**

1. **Install:** `pnpm --filter web add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

2. **Wrap list pages in `DndContext`** at the `GroupedList` level (one context per page is enough; the sensor is global):
   - `<DndContext sensors={...} onDragStart={...} onDragOver={...} onDragEnd={...} collisionDetection={closestCorners}>`
   - Sensors: `PointerSensor` with `activationConstraint: { distance: 6 }` (avoid stealing click on row open), `KeyboardSensor` with `sortableKeyboardCoordinates` (so the list is fully keyboard-operable)

3. **Wrap rows in `useSortable`** with `id={issue.id}`. Each row gets `transform`, `transition`, and `isDragging` from the hook.

4. **Implement reorder**:
   - `onDragOver` (cross-group move): when a row hovers over a different group's empty space, the issue is optimistically moved to that group. The position within the destination group is the end of the visible issues for that status.
   - `onDragEnd` (finalise): call `useIssues.reorderIssues(fromKey, fromIdx, toKey, toIdx)` via `apply()`. Toast: "Reordered".

5. **Custom `DragOverlay`**: render a lifted copy of the row in a portal so the source row can collapse (showing the drop slot). The overlay uses the same `IssueRow` component but with `opacity: 0.95` + a `shadow-[0_8px_24px_rgba(0,0,0,0.4)]`.

6. **Drop indicators**: a 2px tall, `--color-accent` line with rounded ends shows where the row will land. Uses `motion.div layout` for smooth between-tick animation.

7. **Multi-row drag**: if more than one row is selected, dragging any of them drags all of them. The `DragOverlay` renders an `AvatarGroup` + "+ N more" instead of a single row.

8. **Esc cancels**: pressing `Esc` mid-drag reverts. The global keyboard handler in `keyboard.ts` gets a new branch: if a dnd operation is in flight, `Esc` cancels it; otherwise the existing close-anything behaviour wins.

**Files to create / edit:**
- `apps/web/package.json` — add `@dnd-kit/*`
- `apps/web/components/views/grouped-list.tsx` — wrap in `DndContext`, add `useSortable` to `IssueRow`
- `apps/web/components/issue/issue-row.tsx` — apply sortable transform, expose ref + handle
- `apps/web/components/issue/drag-overlay.tsx` — new (portal-based overlay)
- `apps/web/lib/state/keyboard.ts` — add `isDragging` ref + Esc branch
- `apps/web/lib/state/ui.ts` — add `dragging: { ids: string[] } | null` to the store

**Acceptance criteria:**
- Dragging a row 6px lifts it; releasing reorders the list; toast appears with "Reordered · Undo"
- Dragging across a status group header changes the issue's status optimistically (fires `apply()` with `moveToStatus` from 1A, then `reorderIssues` within the destination column)
- Pressing `Esc` mid-drag cancels the operation (no toast)
- Multi-select: select 3 rows, drag one, all 3 move
- Keyboard: Tab to a row, `Space` to lift, arrow keys to move, `Space` to drop, `Esc` to cancel

---

### 1E — Drag to change status (board view)  *(depends on 1A, parallel to 1D)*

**Why:** The board is the most-looked-at view in a project tracker. Status changes via the number keys are fast, but the visual model of "this card belongs in this column" only holds if you can drag a card across columns. Without it, the board is just a list with extra chrome.

**Tasks:**

1. **Reuse the same `@dnd-kit` setup as 1D** at the `CycleBoard` level.

2. **Column drop targets** — each column header / container is a `useDroppable` with `id: col.key`. `BoardCard` is a `useDraggable` with `id: issue.id`.

3. **On drop on a different column**, call `apply({ op: `Moved to ${label}`, undo: …, retry: … })` with `moveToStatus(issue.id, targetCol.key, dropIndex)`.

4. **Cross-column animation** — `motion.button layout` (already on the card) handles the spring transition when a card leaves one column and another arrives.

5. **Drop indicator inside the destination column** — a 1.5px tall line shows insertion point, computed from the hovered card's bounding box.

6. **Empty column feedback** — the "Drop issues here" placeholder is replaced with a dashed 1px outline that brightens on hover, then resolves to the dropped card.

7. **No-reorder within column** (deferred) — the initial cut supports cross-column drops only. Within-column reorder can ride on the list `useSortable` from 1D when the same view is in "list" mode. Out of scope for Phase 1.

**Files to create / edit:**
- `apps/web/components/views/cycle-board.tsx` — wrap in `DndContext`, add droppable columns + draggable cards
- `apps/web/components/issue/board-drag-overlay.tsx` — new (lighter version of the list overlay; same card visual)
- `apps/web/lib/state/ui.ts` — share `dragging` state with 1D so the global `Esc` cancel works for both surfaces

**Acceptance criteria:**
- Drag a card from "Todo" to "In Progress" → card animates into the new column; toast appears; `1`–`5` keys on the new card still work
- Drag back to the original column → `Undo` reverts cleanly
- Esc mid-drag cancels
- Drop on the empty "Done" column places the card there with no jump

---

### 1F — Multi-select + bulk action menu  *(touches every list, depends on 1A)*

**Why:** Every list in the product (inbox, my-issues, views, project issues) needs the same multi-select affordance. The bulk action bar is where undo, archive, and future "Move to project" / "Add label" actions surface.

**Current state:** `useUI.selectedIssueIds: Set<string>` exists. `IssueRow` doesn't yet have a selection checkbox / cmd-click behaviour.

**Tasks:**

1. **Selection triggers**:
   - Click on the row's left edge (8px hot zone) toggles selection
   - `Cmd/Ctrl + click` on the row body also toggles
   - `Shift + click` selects a range from the last anchor
   - `⌘ + A` selects all visible issues in the current view
   - `Esc` clears selection
   - When a row is selected, the row background flips to `var(--color-surface-2)` and a check icon appears in the leading slot

2. **Bulk action bar** — a fixed bottom-positioned bar that slides up when `selectedIssueIds.size > 0`:
   - "{N} selected · Clear"
   - Buttons: Status ▾, Assignee ▾, Labels ▾, Priority ▾, Move to project ▾, Archive
   - Each opens a popover (Radix) with multi-select options
   - "More" overflow menu holds: Copy link, Export CSV, Change due date

3. **Wire to `apply()`** — every bulk action uses `apply({ op: "Archived 5 issues", undo: () => bulkUnarchive(ids), retry: … })`. The undo restores selection.

4. **Selection persistence** — selection is per-page (not in the URL), and clears on route change.

**Files to create / edit:**
- `apps/web/components/issue/issue-row.tsx` — selection state + click handlers
- `apps/web/components/views/grouped-list.tsx` — anchor tracking for shift-click range
- `apps/web/components/views/bulk-action-bar.tsx` — new
- `apps/web/lib/state/ui.ts` — add `selectionAnchorId` for shift-range
- `apps/web/lib/state/keyboard.ts` — `⌘+A` handler, `Esc` clears selection if no overlay is open

**Acceptance criteria:**
- Selecting 5 issues shows the bar; `Archive` removes them and shows a single "Archived 5 · Undo" toast
- After undo, the 5 are back AND the 5 are still selected
- `⌘+A` selects all visible, `Esc` clears
- Selection clears on route change

---

## Cross-cutting concerns

- **Animations:** all new motion uses the existing `lib/motion/variants.ts` spring set. No new easing curves, no new durations. `drag` interactions use `layout` for spring follow-through.
- **Accessibility:** every new drag surface is keyboard-operable (Tab + Space + arrows). Every popover uses Radix's `Popover` (which manages focus correctly). Every new action has a `kbd` chip showing its shortcut.
- **Performance:** `@dnd-kit` is the only new dep. No new rendering work — all lists already memoize. The `DragOverlay` portal keeps the source row in place, so no re-render storm on drag.
- **Type safety:** every new mutation is typed. The `FilterState` is a discriminated union for sort, a `Set` for multi-value fields.
- **Persistence boundary:** `useUI` persists `density`, `groupBy`, `sortKey`, `sortDir`, `showCompletedCycles`. `useIssues` does NOT persist (mock). `useSavedViews` persists to local storage. URL params are the source of truth for filter combos; local storage mirrors them so a freshly opened tab without a URL still gets a sensible default.

---

## File-level change summary

| File | Status | Stream |
|---|---|---|
| `lib/state/issues.ts` | extend | 1A |
| `lib/state/mutations.ts` | new | 1A |
| `lib/state/ui.ts` | extend | 1A, 1D, 1F |
| `lib/state/keyboard.ts` | extend | 1D, 1F |
| `lib/state/saved-views.ts` | new | 1B |
| `lib/state/view-query.ts` | new | 1B |
| `hooks/useViewQuery.ts` | new | 1B |
| `components/shell/toast.tsx` | extend | 1A |
| `components/shell/status-bar.tsx` | extend | 1C |
| `components/views/filter-popover.tsx` | new | 1B |
| `components/views/filter-chips.tsx` | extend | 1B |
| `components/views/view-header.tsx` | extend | 1B |
| `components/views/grouped-list.tsx` | extend | 1D, 1F |
| `components/views/cycle-board.tsx` | extend | 1E |
| `components/views/bulk-action-bar.tsx` | new | 1F |
| `components/issue/issue-row.tsx` | extend | 1A, 1D, 1F |
| `components/issue/issue-drawer.tsx` | extend | 1A |
| `components/issue/create-issue-dialog.tsx` | extend | 1A |
| `components/issue/drag-overlay.tsx` | new | 1D |
| `components/issue/board-drag-overlay.tsx` | new | 1E |
| `app/(workspace)/views/[id]/page.tsx` | refactor | 1B |
| `app/(workspace)/my-issues/page.tsx` | refactor | 1B |
| `app/(workspace)/projects/eng/issues/page.tsx` | refactor | 1B |
| `package.json` (apps/web) | +3 deps | 1D |

---

## Execution order (recommended)

1. **1A foundation** — land mutation engine, toast redo, drawer edit wiring. (Half-day to full day.)
2. **1C density polish** — quick win, decoupled from 1A. (Half-day, can be parallel.)
3. **1B URL-synced filters** — longest single stream; gates saved views. (One to two days.)
4. **1F multi-select + bulk bar** — exposes the full surface of 1A. (Half-day to one day.)
5. **1D drag to reorder (list)** — installs `@dnd-kit`, sets the pattern. (One day.)
6. **1E drag to change status (board)** — reuses 1D's pattern. (Half-day.)

Rough total: 4–6 working days.

---

## Definition of done (Phase 1 exit criteria)

- [ ] Every state change in the UI flows through `apply()` and is revertible via toast
- [ ] Every list view's filters are encoded in the URL and survive reload
- [ ] Density change is visible (status-bar flash + URL param + first-paint animation)
- [ ] Any list row can be reordered by drag; any board card can be moved across columns by drag
- [ ] Multi-select bar appears for any list; bulk actions are undoable
- [ ] `pnpm tsc --noEmit` clean, `pnpm next build` clean
- [ ] All 34 audit screenshots regenerate cleanly + 6 new captures (1D list-mid-drag, 1E board-mid-drag, 1F bulk-bar-open, 1B filter-popover, 1A toast-progress, 1C status-bar-flash)
- [ ] Keyboard-only walkthrough passes: open palette → filter → select all → archive → undo
