---
slug: step-transition-misaligned
status: awaiting_human_verify
trigger: |
  On the onboarding page, the step indicator buttons (1-5) are out of sync with the slide transition animation. Content slides correctly but the progress indicator updates before the animation completes.
created: 2026-06-09
updated: 2026-06-09
goal: find_and_fix
tdd: false
---

## Symptoms

- **Expected**: Step indicator (progress bars + text) should update in sync with the content slide transition
- **Actual**: Content slides first with correct animation, but the step indicator bars/numbers lag behind — they update too early, before the slide animation finishes
- **Timeline**: Always been there
- **Browser**: Firefox

## Current Focus

- **reasoning_checkpoint**:
  - **hypothesis**: The bar-to-content desync is caused by a CSS transition duration (220ms) that's too short and uses wrong easing (`ease` instead of `ease-spring`). Both bars and content start changing at the same time (same `state.step` in same render), but the bars finish in 220ms while the spring slide takes ~300-400ms.
  - **confirming_evidence**:
    - Bar CSS: `transition-colors duration-[220ms]` — finishes in 220ms with CSS `ease` curve
    - Content: `spring: { stiffness: 380, damping: 32 }` — settles in ~300-400ms visually
    - Both bars and content receive new `state.step` in the same `setState` → start simultaneously
    - `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)` is defined in globals.css
  - **falsification_test**: If the duration/easing change does NOT make the bars' transition visible throughout the slide animation (bars still appear to finish too early), then the hypothesis is wrong and we need a different approach (e.g., motion-based animation for bars).
  - **fix_rationale**: By increasing the bar transition to 350ms and matching the easing to the spring's cubic-bezier(0.32, 0.72, 0, 1), the bars' color change will be visible throughout the content's slide animation. Both still start at the same time (same render, same `state.step`), but now they finish at roughly the same time too.
  - **blind_spots**: Haven't confirmed exact spring settle time empirically; 350ms is an approximation. CSS transitions don't perfectly match spring physics — the visual alignment is approximate, not pixel-perfect. The `transition-colors` CSS property may not apply the easing identically to how `motion` applies it.

- **next_action**: Request human verification — confirm the fix by testing the onboarding page

## Evidence

- **timestamp**: 2026-06-09
  - **checked**: `workspace-setup-wizard.tsx` lines 107-123 (progress indicator) and lines 62-64 (goNext)
  - **found**: `goNext()` calls `setState((prev) => ({ ...prev, step: prev.step + 1 }))` which immediately updates both the content `key` (triggering slide) and progress bars
  - **implication**: Progress bars and content both receive the new `state.step` in the same render. Bars update instantly (or with 220ms color transition), while content takes ~320ms spring to slide in.

- **timestamp**: 2026-06-09
  - **checked**: `onAnimationComplete` behavior with `AnimatePresence mode="wait"`
  - **found**: With `mode="wait"`, when `state.step` changes from 1→2: (1) old motion.div key=1 renders with exit animation, (2) `onAnimationComplete` fires when exit completes, (3) old div is removed, (4) new motion.div key=2 mounts and plays enter. Critically, `latestStepRef.current` is set to the NEW step (2) in the render body BEFORE any animation runs. So `onAnimationComplete` on the EXITING element calls `setDisplayedStep(2)` — the bars update to step 2 BETWEEN exit and enter, before the new content even appears.
  - **implication**: The bars don't actually "lag behind" the content as intended. They update mid-transition when the old content finishes exiting, creating the "buttons move in opposite direction" effect — bars advance while old content leaves, before new content arrives.

- **timestamp**: 2026-06-09
  - **checked**: CSS custom properties in globals.css
  - **found**: `--ease-spring: cubic-bezier(0.32, 0.72, 0, 1)` is defined — identical to the conventions' spring easing
  - **implication**: We can use this easing on the bars' CSS transition to match the content's spring animation curve

- **timestamp**: 2026-06-09
  - **checked**: Spring settle time estimation (stiffness:380, damping:32, displacement:24px)
  - **found**: ω₀ = √(380/1) ≈ 19.5 rad/s, ζ = 32/(2√380) ≈ 0.82 → slightly underdamped. Visual settle time ≈ 300-400ms depending on displacement. Current bar transition (220ms) ends well before the spring settles.
  - **implication**: Increasing bar transition to ~350ms with ease-spring curve will make the color transition duration roughly match the spring settle time

## Eliminated

- **hypothesis**: `displayedStep` + `onAnimationComplete` fix solves the desync
  - **evidence**: `onAnimationComplete` fires on the EXITING element's exit (not the entering element's enter) because `latestStepRef.current` is already the new step from the render body. Bars update between exit and enter — mid-transition — creating "buttons move in opposite direction" effect.
  - **timestamp**: 2026-06-09

## Resolution

- **timestamp**: 2026-06-09
  - **action**: Applied `displayedStep` fix (added `displayedStep` state, `latestStepRef`, wired `onAnimationComplete`, updated progress indicator to read from `displayedStep`)
  - **result**: User reports "the buttons during halfway of the transition moves in opposite direction"
  - **implication**: Either (1) the slide exit/enter directions are swapped for progress indicator, or (2) the perceived "direction" of progress bar fill (LTR) conflicts with slide direction, or (3) there's a directional animation on the progress indicator itself that needs correction

root_cause: Progress indicator reads `state.step` directly, which updates synchronously in `goNext()`. The `AnimatePresence` slide animation (~320ms spring, stiffness:380, damping:32) takes time to complete, but the progress bars use CSS `transition-colors duration-[220ms]` which finishes in 220ms — ~100-180ms before the spring settles. The easing mismatch (CSS `ease` vs spring) and duration gap create a visible desync where bars complete their color transition while content is still sliding.

fix: Two-part fix:
1. REVERTED `displayedStep` + `onAnimationComplete` approach (which caused "buttons move in opposite direction" because `onAnimationComplete` fires on the exiting element's exit animation, updating bars mid-transition before new content mounts).
2. INSTEAD: Changed bar transition from `duration-[220ms]` to `duration-[350ms] ease-[var(--ease-spring)]`. This matches the bar color transition duration (~350ms) and easing curve (cubic-bezier(0.32, 0.72, 0, 1)) to the spring slide animation. Both bars and content still update from `state.step` in the same render — they start changing simultaneously and finish at roughly the same time.

verification: Code compiles with no new TypeScript errors. Pre-existing errors (238 in 58 files) affect unrelated drizzle-orm, supabase, and middleware modules. Bar CSS transition now uses the same easing curve (ease-spring) as the slide animation, with 350ms duration to cover the ~300-400ms spring settle time.
files_changed: [apps/web/components/onboarding/workspace-setup-wizard.tsx]

