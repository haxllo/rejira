# Ingest Conflicts Report

**Mode:** merge
**Generated:** 2026-06-09
**Ingest set:** 14 classified documents (1 SPEC, 2 PRD, 11 DOC)
**Precedence:** ADR > SPEC > PRD > DOC (default, no overrides)
**Existing context:** PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, 7 codebase context files

---

## Conflict Detection Report

### BLOCKERS (1)

[BLOCKER] Cross-ref cycle detected in ingest set
  Source files: PLAN.md, PHASE_2_PLAN.md, ARCHITECTURE_13_LAYERS.md, README.md, JIRA_PAIN_POINTS_REPORT.md
  Nature: 5 documents form a strongly connected component via mutual cross-references — DFS cycle detection with three-color marking identified an SCC that prevents safe synthesis.
  Impact: These 5 documents are excluded from per-type intel synthesis. Their content is already captured by existing `.planning/` context files (PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, codebase/ARCHITECTURE.md).
  → Resolve by removing cross-ref cycles via --manifest or breaking the mutual references in source documents. No information is lost — existing context files already cover the content.

### WARNINGS (2)

[WARNING] PHASE_3_PLAN.md cross_ref references unclassified document
  Source: PHASE_3_PLAN.md (source_path: PHASE_3_PLAN.md)
  Reference: docs/security/pen-test-report.md
  Nature: The document lists `docs/security/pen-test-report.md` in its cross_refs, but this file was not found in the CLASSIFICATIONS_DIR. It was either not classified or is missing from the ingest set.
  Impact: Content from this referenced doc is not included in the synthesis. If it contains decisions or constraints that affect Phase 3's security posture, they are absent.
  → Run gsd-doc-classifier on docs/security/pen-test-report.md and re-run gsd-ingest-docs, or document the intended content separately.

[WARNING] Cyclic 5-doc set may contain unresolved spec/architecture contradictions
  Source files: ARCHITECTURE_13_LAYERS.md (DOC, cyclic), PHASE_2_PLAN.md (SPEC, cyclic)
  Nature: The cyclic set includes ARCHITECTURE_13_LAYERS.md (which mentions "Auth.js v5" for L6 in its original text) and PHASE_2_PLAN.md (SPEC-level technical spec for Phase 2 data layer). Both are excluded from synthesis due to the cycle blocker above.
  Impact: The reference to "Auth.js v5" in the original ARCHITECTURE_13_LAYERS.md is stale (the codebase uses Better Auth, confirmed in STACK.md). The cyclic exclusion means this contradiction is not surfaced in synthesis; correctness depends on the existing `.planning/codebase/ARCHITECTURE.md` which was independently refreshed.
  → Verify that `.planning/codebase/ARCHITECTURE.md` reflects the correct Better Auth choice. Current check: confirmed (ARCHITECTURE.md was refreshed 2026-06-07 and references Better Auth correctly).

### INFO (5)

[INFO] PHASE_3_PLAN.md AD-17 (audit log via databaseHooks) vs Phase 2 tg_emit_activity trigger
  Source: PHASE_3_PLAN.md (PRD) — AD-17; PHASE_2_PLAN.md (SPEC, cyclic) — tg_emit_activity trigger
  Note: These are complementary, not contradictory. AD-17 writes `audit_log` for auth events via Better Auth's `databaseHooks`. tg_emit_activity writes `activities` for data-mutation events via Postgres trigger. Different tables, different event sources, no overlap. No resolution needed.

[INFO] PHASE_3_PLAN.md AD-12 (keep u_aria demo owner with known password) — superseded
  Source: PHASE_3_PLAN.md (PRD) — AD-12
  Note: AD-12 planned to keep the demo owner for the migration window (3A–3I). Phase 3 is now complete (verified in STATE.md and ROADMAP.md) and the dev seed has been replaced. AD-12 is no longer relevant. No active conflict.

[INFO] No LOCKED-vs-LOCKED ADR contradictions found
  Note: None of the 14 classified documents have `locked: true`. No standalone ADR documents exist in the ingest set. No LOCKED-vs-LOCKED check was triggered.

[INFO] No UNKNOWN-confidence-low documents found
  Note: All 14 documents have medium (7) or high (7) confidence. No user re-tagging needed.

[INFO] No PRD requirement overlap with divergent acceptance criteria found
  Note: The two PRD documents (PHASE_1_PLAN.md, PHASE_3_PLAN.md) cover different phases (Phase 1 and Phase 3). Their acceptance criteria target different scopes. No competing variants to preserve.
