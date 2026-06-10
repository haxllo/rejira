---
slug: onboarding-next-button-text
status: fixing
trigger: |
  On the onboarding page, the next buttons from steps 1 to 5 have white text on a white background — text is not visible.
created: 2026-06-09
updated: 2026-06-09
goal: find_and_fix
tdd: false
---

## Symptoms

- **Expected**: Dark text on light background (contrast should be readable)
- **Actual**: White text on white background — text invisible
- **Timeline**: Not specified
- **Errors**: No console errors
- **Browser**: Firefox
- **Theme**: Both dark and light mode — same issue

## Current Focus

### Reasoning Checkpoint

**hypothesis:** The button's CVA `size` variants use `text-[var(--text-md)]`, `text-[var(--text-base)]`, etc. as arbitrary values. Tailwind v4's JIT compiler cannot determine that `var(--text-md)` is a font-size value — it interprets these arbitrary values as color utilities. This generates `.text-\[var\(--text-md\)\] { color: var(--text-md); }` instead of `font-size: var(--text-md)`. Since `var(--text-md)` resolves to `14px` (invalid as color), the browser discards the color declaration and falls back to inherited `color: var(--color-text)` = near-white — matching the `bg-[var(--color-text)]` background.

**confirming_evidence:**
- Compiled CSS shows `.text-\[var\(--text-md\)\] { color: var(--text-md); }` at line 2379 — Tailwind treats it as COLOR not FONT SIZE
- `--text-md: 14px` is a length value, invalid as color → browser discards it → inherited color wins
- The inherited color from `html, body { color: var(--color-text) }` = near-white (same as button background)
- Button's `text-[var(--color-text-inverse)]` comes BEFORE the size variant classes in the class string, so it gets overridden
- `.text-xs` and `.text-sm` work correctly because Tailwind recognizes them as native size utilities (JIT detected them in source)
- All 5 step buttons use `<Button variant="primary">` so all are affected

**falsification_test:** If `text-md` is used directly (not as arbitrary value), Tailwind v4 will generate `.text-md { font-size: var(--text-md); line-height: var(--tw-leading, var(--text-md--line-height)); }` and the button text will correctly be near-black with proper font size.

**fix_rationale:** Replace `text-[var(--text-*)]` with direct Tailwind v4 size utilities (`text-xs`, `text-sm`, `text-base`, `text-md`). These are properly recognized as font-size utilities by Tailwind v4's JIT compiler and generate correct `font-size` declarations without interfering with the button's text color.

**blind_spots:** None — evidence is directly from compiled CSS output.

## Evidence

## Eliminated

## Resolution

