# Phase 6: Search & AI — Summary

**Status**: ✅ Complete (3/3 plans executed)
**Commits**: `ceb1b7b`, `10212b5`, `be170aa`
**Plans**: 06-01 (Hybrid Search Engine), 06-02 (Semantic ⌘K & AI Triage), 06-03 (Summarize & Cost Mgmt)

## Delivered

### 06-01 — Hybrid Search Engine
- `lib/ai/client.ts` — OpenAI client factory (per-workspace key, gpt-4o-mini default)
- `lib/ai/embed.ts` — text-embedding-3-small (1536d) embedding generation
- `lib/db/queries/search.ts` — hybrid (BM25 tsvector + pgvector cosine) search with RRF fusion (k=60)
- `supabase/migrations/0029_embeddings_index.sql` — IVFFlat index + `match_issues_by_embedding` function
- `supabase/migrations/0030_search_vector_trigger.sql` — tsvector auto-update trigger
- Embedding auto-generation wired into `createIssue`, `setTitle`, `setDescription` in `lib/db/actions/issues.ts`

### 06-02 — Semantic ⌘K & AI Triage
- AI/⌘ toggle for search mode in `command-palette.tsx`
- Debounced hybrid search (200ms)
- `app/api/search/route.ts` — search endpoint
- `app/api/ai/triage/route.ts` — OpenAI structured output for issue triage
- AI Assist button in `create-issue-dialog.tsx` with inline suggestion cards

### 06-03 — Summarize & Cost Management
- `app/api/ai/summarize/route.ts` — issue+comments → 3-5 bullet summary
- "Summarize this issue" action in `issue-drawer.tsx` with collapsible banner
- `lib/ai/cost.ts` — `recordAICost` + `checkAIBudget` with workspace-level budget caps
- `supabase/migrations/0031_ai_cost_tracking.sql` — schema + pg_cron monthly reset
- AI settings page at `app/(workspace)/settings/ai/` (key entry, budget slider, toggle, remove confirmation)
- `app/api/db/settings-ai/route.ts`

## Known Issues
- `command-palette.tsx` `hasAIKey` hardcoded to `true` (should check workspace config)
- Triage route doesn't wire `recordAICost` properly in early return paths
- `lib/db/queries/search.ts` dynamic import pattern fragile for embedding gen
- ~150 pre-existing tsc errors from drizzle-orm v1 RC (non-blocking, `next build` works)
