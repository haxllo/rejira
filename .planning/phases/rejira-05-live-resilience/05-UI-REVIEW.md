# Phase 5 — UI Review

**Audited:** 2026-06-10
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** Not captured (code-only audit)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Strong empty/error states; minor genericisms in collaborative labels |
| 2. Visuals | 3/4 | Solid hierarchy with backdrop blur and spring animations; activity timeline well-executed |
| 3. Color | 3/4 | Consistent CSS var usage; 2 hardcoded hex values found; no accent token overuse |
| 4. Typography | 2/4 | 12+ arbitrary font sizes in use; no consolidation to design system tokens |
| 5. Spacing | 2/4 | Pervasive arbitrary spacing values (`[27px]`, `[400px]`, etc.) deviate from 8pt grid |
| 6. Experience Design | 3/4 | Error boundaries + Sentry wired; empty states present; loading states inconsistent |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **Consolidate arbitrary font sizes** — 12+ unique pixel values (`[9.5px]` through `[15px]`) fragment the type scale. Replace with design tokens (`text-xs`/`text-sm`/`text-base`). Affects inbox, activity, drawer, shell components.

2. **Eliminate arbitrary spacing values** — Widespread use of `[27px]`, `[400px]`, `[13px]`, `[12.5px]` bypasses the 8pt grid. Replace with Tailwind's built-in spacing scale (multiples of 4px).

3. **Add loading/skeleton states to data-bound components** — Inbox, activity feed, issue drawer, and mailbox stream have empty states but no loading states. Users see flash-of-empty on slow connections.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- Empty states use specific, helpful language: "No activity yet", "You're all caught up", "No new notifications — your inbox is empty"
- Error states are branded: "Something went wrong" with Sentry reference
- Email templates have descriptive subject lines per notification type
- Icon buttons carry `aria-label` attributes (e.g., `"Open navigation"`, `"Close navigation"`, `"Account"`, `"AI"`, `"Inbox"`)
- Inbox filter tabs: "all", "unread", "mentions" — clear and concise
- Activity verb labels are well-mapped: `created`, `updated`, `assigned`, `commented`, `status_changed`

**Issues:**
- `issue-description-editor.tsx:95` — "Collaborative editing active" is functional but could be more user-friendly ("Co-editing enabled")
- `page-error-fallback.tsx:37` — "Try again" is standard but generic; could be more contextual ("Reload this page")
- Inbox `FilterTabs` render raw `t.key` as label text rather than human-readable labels (acceptable since keys match display names, but fragile)

### Pillar 2: Visuals (3/4)

**Strengths:**
- Clear visual hierarchy through size and weight differentiation in primary-nav, drawer headers
- Sticky headers with `backdrop-blur` create depth (top-bar, drawer-header, inbox date groups)
- AnimatePresence used throughout: drawer slides from right, overlay fades, mobile nav slides from left
- Spring physics on drawer/mobile-nav (`stiffness: 380, damping: 36`) matches the design system's `ease-spring` cubic-bezier
- Activity timeline uses a vertical connector line with avatar dots — good timeline pattern
- Presence avatars in drawer header with overlapping (`-space-x-1.5`) and overflow counter
- Inbox items have hover reveal for arrow-up-right icon (delightful microinteraction)

**Issues:**
- Focal point on some pages (activity, my-issues) is unclear — lacks a dominant visual anchor
- Activity feed items stack vertically with no grouping by time period (unlike inbox which groups by Today/Yesterday/Week)
- `issue-description-editor.tsx:104` — plain `<textarea>` feels visually disconnected from the rest of the polished drawer; no rich toolbar or formatting indicators

### Pillar 3: Color (3/4)

**Strengths:**
- Extensive use of CSS custom properties: `--color-text`, `--color-text-muted`, `--color-text-faint`, `--color-bg`, `--color-surface-1/2/3`, `--color-border`, `--color-accent`, `--color-danger`, `--color-success`, `--color-hover`, `--color-overlay`
- Zero usage of `text-primary`/`bg-primary`/`border-primary` utility classes — project uses CSS var reference pattern instead, which is consistent
- Accent color used sparingly and purposefully: unread dot, unread count badge, empty state check icon
- Dark mode first by default with CSS var theming

**Issues:**
- `issue-description-editor.tsx:39` — hardcoded `#6366f1` (indigo) for Yjs user color; should reference a CSS var
- `settings/profile-form.tsx:34` — hardcoded `#6b5ce7` for default avatar color
- No evidence of 60/30/10 color distribution enforcement — accent may be underutilized for interactive elements
- Cycle progress bar uses OKLCH gradient directly (`oklch(0.78 0.15 200)` to `oklch(0.78 0.16 150)`) rather than a token — intentional but fragile

### Pillar 4: Typography (2/4)

**Strengths:**
- Only 3 standard Tailwind sizes used: `text-xs` (12px), `text-sm` (14px), `text-base` (16px)
- Font weights limited to 3: `font-medium`, `font-semibold`, `font-bold` — clean distribution
- `font-mono` used appropriately for issue keys, counts, and keyboard shortcuts
- `uppercase tracking-[0.08em]` pattern for section headers consistent across components

**Issues:**
- **12+ arbitrary font sizes found** — this is the biggest typography concern:
  - `text-[9.5px]` — kbd elements
  - `text-[10px]` — error digest, unread count, cycle progress stats
  - `text-[10.5px]` — issue key, section headers, inbox meta
  - `text-[11px]` — activity timestamps, inbox date group label
  - `text-[11.5px]` — activity empty state subtext
  - `text-[12px]` — drawer meta (assignee, cycle, labels), empty states
  - `text-[12.5px]` — body text in nav items, inbox items, activity descriptions
  - `text-[13px]` — description editor text, activity empty state
  - `text-[14px]` — error boundary heading, inbox empty state heading
  - `text-[15px]` — auth shell heading
- These should map to design tokens. `text-[12.5px]` alone appears across 6+ components.
- Missing `text-lg` (18px) and `text-xl` (20px) for page titles

### Pillar 5: Spacing (2/4)

**Strengths:**
- Inbox groups and activity items use consistent `gap-1.5`, `gap-2`, `gap-3` patterns
- Drawer uses `px-5 py-2.5` for header, which aligns roughly with 8pt grid
- Mobile nav uses `size-7` and `size-10` for buttons
- Primary nav uses `h-7` for nav items, `gap-0.5` between items

**Issues:**
- **Pervasive arbitrary spacing values:**
  - `left-[-27px]` — activity feed timeline dot positioning
  - `max-w-[400px]` — auth shell
  - `min-h-[400px]` — error boundary
  - `max-w-[520px]` — search bar
  - `max-w-[680px]` — drawer width
  - `w-[244px]` — primary nav width
- Inconsistent padding patterns: `px-6 py-2` vs `px-5 py-2.5` vs `px-4 py-3`
- No consistent section heading spacing — some use `mt-5`, others `mt-1.5`
- Activity feed uses `ml-2` for the timeline offset — should use a design token

### Pillar 6: Experience Design (3/4)

**Strengths:**
- **Error boundaries**: Root `app/error.tsx`, workspace `app/(workspace)/error.tsx`, plus `Sentry.ErrorBoundary` wrapper around workspace content
- **Empty states**: Inbox (`InboxEmptyState`), activity feed (`length === 0` check), cheatsheet (`No shortcuts match`), settings sessions, command palette
- **Keyboard support**: Escape closes drawer/mobile-nav; `⌘K` opens command palette; number keys for status in drawer; `aria-label` on all icon buttons
- **Spring animations**: Drawer open/close, mobile nav, inbox item entrance, cycle progress bar
- **Mobile responsive**: Dedicated `MobileNavToggle` with animated slide-out drawer; media query breakpoints; responsive search label
- **Form states**: Auth forms have loading spinners, disabled states during submission, error handling via try/catch
- **Presence UX**: Real-time online users shown in drawer header with overflow count

**Issues:**
- **Missing loading states**: Inbox stream, activity feed, issue drawer body have no loading/skeleton state — users see a blank container while data streams in
- **No confirmation for destructive actions**: No evidence of confirmation dialogs for issue deletion, status changes, or member removal
- **No pagination feedback**: Activity feed loads up to 200 items (`?limit=` param) but no visual indicator that more results exist
- **Collaborative editing**: Editor poll at 2s intervals for awareness — acceptable but uses polling instead of Realtime broadcast (would be snappier)

---

## Registry Safety

No `components.json` found — shadcn is not initialized. Registry audit skipped.

---

## Files Audited

- `apps/web/components/shell/primary-nav.tsx`
- `apps/web/components/shell/top-bar.tsx`
- `apps/web/components/shell/mobile-nav.tsx`
- `apps/web/components/inbox/inbox-stream.tsx`
- `apps/web/components/inbox/inbox-item.tsx`
- `apps/web/components/issue/issue-drawer.tsx`
- `apps/web/components/issue/issue-description-editor.tsx`
- `apps/web/components/activity/activity-feed.tsx`
- `apps/web/components/error-boundary/page-error-fallback.tsx`
- `apps/web/components/error-boundary/sentry-error-boundary-wrapper.tsx`
- `apps/web/components/workspace/presence-wrapper.tsx`
- `apps/web/lib/realtime/presence.tsx`
- `apps/web/app/(workspace)/layout.tsx`
- `apps/web/app/(workspace)/error.tsx`
- `apps/web/app/(workspace)/activity/page.tsx`
- `apps/web/app/(workspace)/inbox/page.tsx`
- `apps/web/app/error.tsx`
- `apps/web/lib/email/templates/issue-assigned.tsx`
- `apps/web/lib/email/templates/issue-mentioned.tsx`
- `apps/web/lib/email/templates/issue-status-changed.tsx`
- `apps/web/lib/email/templates/issue-commented.tsx`
- `apps/web/lib/email/templates/unsubscribe.tsx`
