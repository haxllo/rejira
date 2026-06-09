# Requirements (PRD Extract)

## Source Documents

| Source | Type | Phase | Status |
|--------|------|-------|--------|
| PHASE_1_PLAN.md | PRD | Phase 1 — Interactions | Complete (verified in ROADMAP.md) |
| PHASE_3_PLAN.md | PRD | Phase 3 — Auth & Identity (Better Auth) | Complete (7/7 plans, verified in ROADMAP.md + STATE.md) |

## Assessment

All requirements defined in the incoming PRD documents are **already captured** in the existing `.planning/REQUIREMENTS.md`. No new requirements were discovered — the incoming PRD documents confirm what is already tracked.

### Phase 1 Requirements (PHASE_1_PLAN.md)

The document describes 6 streams (1A–1F) with acceptance criteria. These map to already-completed Phase 1 work in the existing roadmap:

- **1A** — Optimistic mutation engine with toast undo → covered by existing Phase 0/1 state
- **1B** — URL-synced filters (group, sort, status, assignee, label, priority, due)
- **1C** — Density toggle polish (compact/default/roomy)
- **1D** — Drag to reorder (list views) via @dnd-kit
- **1E** — Drag to change status (board view)
- **1F** — Multi-select + bulk action bar

**Acceptance criteria (from source, for traceability):**
- Every state change in the UI flows through `apply()` and is revertible via toast
- Every list view's filters are encoded in the URL and survive reload
- Density change is visible (status-bar flash + URL param + first-paint animation)
- Any list row can be reordered by drag; any board card can be moved across columns by drag
- Multi-select bar appears for any list; bulk actions are undoable

### Phase 3 Requirements (PHASE_3_PLAN.md)

The document defines 17 sub-phases (3A–3Q) for Better Auth integration. These map directly to existing requirements already marked complete:

| Existing Req | Covered By | Status |
|-------------|-----------|--------|
| AUTH-01 (email+password) | 3B | Complete (REQUIREMENTS.md) |
| AUTH-02 (email verification) | 3B | Complete |
| AUTH-03 (password reset) | 3B | Complete |
| AUTH-04 (session persistence) | 3D | Complete |
| AUTH-05 (Google OAuth) | 3C | Complete |
| AUTH-06 (GitHub OAuth) | 3C | Complete |
| AUTH-07 (magic link) | 3C | Complete |
| AUTH-08 (TOTP 2FA) | 3E | Complete |
| AUTH-09 (passkeys) | 3K | Complete |
| AUTH-10 (IP/UA tracking) | 3D, 3G | Complete |
| AUTH-11 (rate limiting) | 3J | Complete |
| AUTH-12 (CSRF/origin checks) | 3J | Complete |
| WORK-02..08 (workspaces, invites, roles) | 3F, 3G, 3H | Complete |

## Forward References

The existing REQUIREMENTS.md already tracks forward requirements for Phase 4+ (PROJ-01..09, ISSUE-01..20, INBOX-01..05, ACT-01..05, etc.). The incoming PRD documents do not add or modify these.

## Traceability

- Phase 1 requirements: 0 new (all already in existing REQUIREMENTS.md and marked complete)
- Phase 3 requirements: 0 new (all already in existing REQUIREMENTS.md and marked complete)
- Total incoming requirements: 0 new
- Total in existing REQUIREMENTS.md: 130 v1 requirements + 18 v2 requirements
