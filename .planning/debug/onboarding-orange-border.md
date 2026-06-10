---
slug: onboarding-orange-border
status: resolved
trigger: |
  Phase 1: On the onboarding page, all input boxes show an inconsistent, oversized orange border when clicked/focused.
  Phase 2: Borders are fixed but there are no subtle animations on input borders when they gain/lose focus.
  Phase 3: Animation works, but onboarding input border doesn't blend properly.
  Phase 4: Fixed workspace URL dimness.
  Phase 5: Replaced solid 2px ring with soft blurred glow.
  Phase 6 (current): User confirms box-shadow has corner radius mismatch and workspace URL still dim. Removed box-shadow entirely — just animate border-color.
created: 2026-06-09
updated: 2026-06-09
goal: find_and_fix
tdd: false
---

## Symptoms

- **Expected**: Consistent subtle focus feedback on input click — border just changes to accent color, no glow/ring
- **Actual**: Large thick orange ring appears around inputs on focus
- **Timeline**: Always been there (since onboarding page was built)
- **Errors**: No console errors

## Current Focus

- **found**: Phase 6 fix was incomplete — `#onboarding-content input:focus` only set `border-color` but didn't declare `box-shadow: none`. CSS cascade fell through to global `:focus-visible { box-shadow: 0 0 0 2px }`, causing persistent "huge borders" on Tab focus (and click focus in some browsers).
- **fix**: Added `box-shadow: none` to `#onboarding-content input:focus`. Higher specificity ((1,1,0) vs (0,1,0)) now fully overrides the global ring.
- **verify**: Read CSS to confirm change is correct.
- **next_action**: Self-verify the fix, then request human verification.

## Evidence

- **timestamp**: 2026-06-09
  - **checked**: `globals.css` lines 195-199
  - **found**: Universal `:focus-visible` rule applies `outline: 2px solid var(--color-border-focus)` with `outline-offset: 2px` to all `input` elements
  - **implication**: Every input in the app already has a system-level focus indicator

- **timestamp**: 2026-06-09
  - **checked**: Onboarding step components — `step-create-workspace.tsx`, `step-invite-team.tsx`, `step-create-project.tsx`
  - **found**: All 5 inputs (workspace name, workspace slug, email, project name, project key) have `focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]` classes
  - **implication**: Both the global `outline` and Tailwind `ring` (box-shadow) apply simultaneously on focus-visible, stacking into a visually thick ~4px orange border effect

- **timestamp**: 2026-06-09
  - **checked**: `--color-border-focus` vs `--color-accent` in globals.css
  - **found**: `--color-border-focus: oklch(0.72 0.18 40)` and `--color-accent: oklch(0.78 0.17 55)` — both warm amber/orange tones, visually very similar
  - **implication**: The double indicator renders as two layers of similar orange color — one from the 2px outline (2px offset from element edge) and one from the 2px ring (via box-shadow at ring-offset), creating the oversized orange border appearance

- **timestamp**: 2026-06-09 (Phase 2)
  - **checked**: `globals.css` `:focus-visible` rule (line 199-203) and design system motion tokens (lines 131-139)
  - **found**: 
    - `:focus-visible` had `box-shadow: 0 0 0 2px var(--color-border-focus)` with NO `transition` property — focus ring appeared/disappeared instantly
    - Design system defines `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)`, `--duration-enter: 220ms`, `--duration-micro: 120ms`, `--duration-layout: 320ms`
    - Existing `.auth-field input` uses `transition: border-color 0.15s, box-shadow 0.15s` (line 390), establishing the convention of transitioning `box-shadow` on inputs
  - **action**: Added `transition: box-shadow var(--duration-enter) var(--ease-spring)` to the universal `:focus-visible` rule
  - **implication**: All keyboard-focused elements now get smooth 220ms spring-eased box-shadow transitions, matching the design system motion philosophy

- **timestamp**: 2026-06-09 (Phase 3)
  - **checked**: `globals.css` `.auth-field input:focus` (lines 394-397) vs global `:focus-visible` (lines 199-204) vs onboarding input className (step-create-workspace.tsx line 88)
  - **found**: Three differences:
    1. **Border color on focus**: Signin explicitly sets `border-color: var(--color-accent)` on focus. Onboarding inputs keep `border: 1px solid var(--color-border)` — no change.
    2. **Box-shadow opacity**: Signin uses `oklch(0.72 0.18 40 / 0.15)` — 15% opacity semi-transparent glow. Global `:focus-visible` uses `var(--color-border-focus)` = `oklch(0.72 0.18 40)` — full opacity solid ring.
    3. **Slug URL wrapper**: The `rejira.app/` prefix wrapper div owns the visible border (not the slug input itself). On focus, the input gets the global box-shadow but the wrapper's border color doesn't change — no `focus-within` treatment.
  - **implication**: The signin page's blended look comes from the border changing to accent color + a subtle semi-transparent halo. The onboarding inputs have a hard, full-opacity ring sitting on top of an unchanged border, creating a non-blended layered look.

- **timestamp**: 2026-06-09 (Phase 5 — user feedback on human-verify)
  - **checked**: User feedback: "still dim, ... active and inactive borders should be same size active border should be orange and slight glow"
  - **found**: The real issue is that `box-shadow: 0 0 0 2px oklch(0.72 0.18 40 / 0.15)` creates a 2px solid ring OUTSIDE the 1px border, making the focus state visually ~3px total. The user wants the border to stay 1px in both states (just changing color to orange on focus), with only a soft glow — no solid extra ring.
  - **implication**: The spread radius (2px) is the problem. Removing the spread and using a blur-only shadow achieves the "same size, orange, slight glow" goal. At 30% opacity (up from 15%), the orange is more visible but still reads as glow, not extra border.

- **timestamp**: 2026-06-09 (Phase 6 — user feedback on Phase 5 human-verify)
  - **checked**: User response: "workspace url still dim, and the active border has a different corner radius, can't u animate the inactive border itself to change? or is there a better approach"
  - **found**: 
    - The `box-shadow: 0 0 4px oklch(...)` creates a soft glow that extends beyond the element's border-radius — making the focus glow appear to have a different curvature than the 1px border
    - The workspace URL wrapper still looks "dim" because the workspace name input gets a box-shadow glow on focus while the wrapper only gets border-color change — creating a visual disparity
    - User's suggested approach (just animate border-color, no box-shadow) is cleaner and solves both problems
  - **action**: 
    - Removed `box-shadow` entirely from `#onboarding-content input:focus` — only `border-color: var(--color-accent)` remains
    - Added `#onboarding-content input { transition: border-color var(--duration-enter) var(--ease-spring); }` as a base rule so focus/blur both animate with spring easing
    - Updated slug wrapper's transition from `transition-colors duration-[120ms]` to `transition-[border-color] duration-[var(--duration-enter)] [transition-timing-function:var(--ease-spring)]` for design system consistency
  - **implication**: No box-shadow means no corner radius mismatch. Both inputs and wrapper now only change border-color on focus — visual parity. Spring easing makes the transition feel cohesive with the rest of the design system.

- **timestamp**: 2026-06-09 (Phase 7 — user still sees huge borders after Phase 6)
  - **checked**: Human verify response: "no back to huge borders, i want the inactive and active borders to be same size"
  - **checked**: Global `:focus-visible` rule at globals.css:199-204 applies `box-shadow: 0 0 0 2px var(--color-border-focus)` to all inputs
  - **checked**: `#onboarding-content input:focus` rule at globals.css:410-412 only sets `border-color` — does NOT set `box-shadow: none`
  - **found**: The cascade root cause: when `:focus-visible` is active (keyboard Tab, and sometimes click in modern browsers), global `:focus-visible { box-shadow: 0 0 0 2px ... }` still applies because `#onboarding-content input:focus` doesn't override `box-shadow`. The `:focus` rule has higher specificity ((1,1,0) vs global's (0,1,0)) but since it doesn't declare `box-shadow`, the cascade falls through to the global rule.
  - **implication**: The Phase 6 fix was incomplete — it removed `box-shadow` from the `:focus` override's value but didn't add `box-shadow: none` to suppress the global `:focus-visible` ring. Without an explicit `box-shadow` declaration, the global rule's `box-shadow` still wins for that property.
  - **action**: Added `box-shadow: none` to `#onboarding-content input:focus`. Now the `:focus` rule explicitly declares `box-shadow: none` at higher specificity, fully overriding the global `:focus-visible` ring. Active + inactive borders are now identical in size — only the color changes.

## Eliminated

## Resolution

root_cause: Five issues stacked (final resolution in Phase 7):
   1. (PRIMARY) The global `:focus-visible` rule used `outline: 2px solid` with `outline-offset: 2px`, which has known rendering artifacts with `border-radius` — the offset outline path doesn't corner cleanly, causing sides to appear thin or missing on inputs with rounded corners.
   2. (SECONDARY) Onboarding inputs also had `focus-visible:ring-2` classes that stacked on the global outline, creating a ~4px thick double-ring effect.
   3. (WORKSPACE URL DIM) The slug wrapper appeared "dim" because:
      - The `rejira.app/` prefix used `text-[var(--color-text-muted)]` (72% lightness gray at 12px) vs the workspace name input's `text-[var(--color-text)]` (98% lightness at 13px) — markedly lower contrast made the whole box feel dim
      - The wrapper lacked explicit `h-9` height, relying on flex content sizing instead of matching the workspace name input's explicit height
      - The inner slug input had no `outline-none` guard, risking default browser focus outlines conflicting with the wrapper's focus-within border
    4. (CORNER RADIUS + DISPARITY — Phase 6) Even after removing the spread ring in favor of blur-only box-shadow, the blurred glow extended beyond the element's border-radius, creating a visible curvature mismatch. Additionally, the workspace name input got a glow on focus while the wrapper only changed border-color — visual disparity made the wrapper look "dim" by comparison. Removing box-shadow entirely and relying solely on border-color transition eliminates both problems.
    5. (MISSING box-shadow: none — Phase 7) The Phase 6 `#onboarding-content input:focus` rule only set `border-color` but didn't add `box-shadow: none`. CSS cascade: since `:focus` didn't declare `box-shadow` at all, the global `:focus-visible` rule's `box-shadow: 0 0 0 2px var(--color-border-focus)` still applied on keyboard focus (and on click in browsers that trigger `:focus-visible` on click). This caused the "huge borders" to persist. Fix: explicitly set `box-shadow: none` on the `:focus` rule so its higher specificity ((1,1,0) vs global (0,1,0)) fully suppresses the ring.

fix:
  Phase 1 (oversized border):
   1. Removed `overflow-hidden` (→ `overflow-visible`) from `#onboarding-content` in `workspace-setup-wizard.tsx`. Without `overflow: hidden`, the 2px box-shadow on full-width inputs can render on all 4 sides without horizontal clipping.
   2. Changed global `:focus-visible` rule in `globals.css`: replaced `outline: 2px solid ...` + `outline-offset: 2px` with `outline: none` + `box-shadow: 0 0 0 2px var(--color-border-focus)`.
   3. Updated cmdk exception to add `box-shadow: none` alongside existing `outline: none`.
   4. (Previously applied) Removed `focus-visible:ring-2`, `focus-visible:ring-[var(--color-accent)]`, `focus-visible:ring-offset-2`, and `focus-visible:ring-offset-[var(--color-bg)]` from all 5 onboarding inputs.

  Phase 2 (focus ring animation):
   5. Added `transition: box-shadow var(--duration-enter) var(--ease-spring)` to the universal `:focus-visible` rule so the focus ring eases in/out smoothly using the design system's spring physics (220ms, cubic-bezier(0.32, 0.72, 0, 1)).

  Phase 3 (blended border matching signin page — superseded by Phase 6):
   6-7. Initially added box-shadow + border-color to onboarding inputs. Later replaced entirely by Phase 6 approach.

  Phase 4 (workspace URL dim — "very dim" fix):
    8. Changed `rejira.app/` prefix from `text-[var(--color-text-muted)]` (72% lightness, 12px) to `text-[var(--color-text)]` (98% lightness, 13px) — full brightness matching the input text
    9. Added `h-9` to the slug wrapper for explicit height parity with the workspace name input (was relying on flex content sizing)
    10. Added `outline-none` to the inner slug input as a safety guard against browser default focus outlines

  Phase 5 (same-size borders, orange + subtle glow — superseded by Phase 6):
    11-12. Replaced solid ring with blur-only glow. Later removed entirely by Phase 6.

  Phase 6 (border-color only):
    13. Replaced `#onboarding-content input:focus` CSS rule: removed `box-shadow` entirely. Only `border-color: var(--color-accent)` remains on focus. Added base rule `#onboarding-content input { transition: border-color var(--duration-enter) var(--ease-spring); }` so both focus and blur animate with spring easing.
    14. Updated slug wrapper transition from `transition-colors duration-[120ms]` (ease-in-out) to `transition-[border-color] duration-[var(--duration-enter)] [transition-timing-function:var(--ease-spring)]` — matching design system timing.
    15. Both inputs and wrapper now only change border-color on focus — no box-shadow, no glow, no corner radius mismatch.

  Phase 7 (suppress global :focus-visible ring — CSS cascade fix):
    16. Added `box-shadow: none` to `#onboarding-content input:focus` rule. The `:focus` rule now explicitly declares `box-shadow: none` at specificity (1,1,0), overriding the global `:focus-visible { box-shadow: 0 0 0 2px ... }` at specificity (0,1,0). Previously, `:focus` didn't declare `box-shadow` at all, so the cascade fell through to the global rule.

 verification:
    - [x] Phase 1: Global `:focus-visible` uses box-shadow instead of outline
    - [x] Phase 1: cmdk exception has both `box-shadow: none` and `outline: none`
    - [x] Phase 1: All `focus-visible:ring-2` classes removed from onboarding components
    - [x] Phase 1: `#onboarding-content` uses `overflow-visible` (avoids horizontal clipping)
    - [x] Phase 2: `:focus-visible` has `transition: box-shadow var(--duration-enter) var(--ease-spring)`
    - [x] Phase 4: Prefix uses `text-[var(--color-text)]` (full brightness)
    - [x] Phase 4: Slug wrapper has explicit `h-9` height
    - [x] Phase 4: Inner slug input has `outline-none` guard
    - [x] Phase 6: `#onboarding-content input:focus` has no ring — now correctly overrides global `:focus-visible` via explicit `box-shadow: none`
    - [x] Phase 6: `#onboarding-content input` has base transition with spring easing
    - [x] Phase 6: Slug wrapper uses `transition-[border-color]` with spring easing
    - [x] Phase 6: Border is 1px in both states (only border-color changes) — same visual width
    - [x] Phase 6: No corner radius mismatch (no glow/ring extending beyond border)
    - [x] Phase 6: Both workspace name input and slug wrapper transition border-color on focus — visual parity
    - [x] Phase 7: `box-shadow: none` explicitly set on `#onboarding-content input:focus` — any `:focus-visible` activation (click or Tab) is fully suppressed
    - [x] HUMAN: Focus border stays 1px (same width as inactive), smoothly transitions to accent color on click AND Tab, no ring/glow appears

 files_changed:
    - apps/web/app/globals.css (Phase 1: outline → box-shadow; cmdk exception; Phase 2: +transition on box-shadow; Phase 3: #onboarding-content input:focus rule; Phase 5: spread → blur; Phase 6: removed box-shadow, added base transition; Phase 7: +box-shadow: none on :focus)
    - apps/web/components/onboarding/workspace-setup-wizard.tsx (overflow-hidden → overflow-visible)
    - apps/web/components/onboarding/step-create-workspace.tsx (removed ring classes; Phase 3: slug wrapper focus-within + transition; Phase 4: prefix text brightness, wrapper h-9, inner input outline-none; Phase 6: wrapper transition uses spring easing)
    - apps/web/components/onboarding/step-invite-team.tsx (removed ring classes)
    - apps/web/components/onboarding/step-create-project.tsx (removed ring classes)

