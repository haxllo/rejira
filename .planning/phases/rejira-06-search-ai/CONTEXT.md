# Phase 6: Search & AI — Context

## Prior Decisions

- **Hybrid search**: BM25 (Postgres tsvector) + pgvector (cosine similarity) with Reciprocal Rank Fusion.
- **Existing infrastructure**: pgvector extension enabled in migration 0000; `search_vector tsvector` column on issues table (migration 0009) with GIN index; `embedding vector(1536)` column on issues table; `cmdk` library already wired in `command-palette.tsx`.
- **AI SDK**: Raw OpenAI SDK (`openai` npm package) with per-workspace BYO API key. No Vercel AI SDK.
- **Cost cap**: AI usage cost cap stored in `workspace_security_policy` table (already exists from Phase 3M).
- **AI features**: (1) Semantic ⌘K hybrid search, (2) AI triage on create-issue dialog, (3) "Summarize this issue" action in issue drawer.
- **Key storage**: Per-workspace AI key in `workspace_security_policy.ai_api_key` column and `ai_provider` (openai/anthropic).
- **Realtime layer exists** (Phase 4F) — subscriptions for issues, comments, notifications, memberships, cycles, projects, saved_views.
- **Command palette** already exists at `apps/web/components/shell/command-palette.tsx`, currently uses mock data via Zustand stores.
- **No OpenAI/Anthropic npm deps** installed yet.

## Codebase State

- `supabase/migrations/0000_initial_schema.sql`: `CREATE EXTENSION IF NOT EXISTS vector;`, `embedding vector(1536)` on issues.
- `supabase/migrations/0009_tsvector.sql`: `search_vector tsvector` column with GIN index on issues.
- `apps/web/components/shell/command-palette.tsx`: Existing cmdk-based palette (305 lines) with mock data, keyboard shortcuts, navigation actions.
- `apps/web/lib/realtime/subscriptions.ts`: 7 subscription helpers available.
- `apps/web/lib/db/queries/issues.ts`: RSC query helpers for issues (from Phase 4A).
- `workspace_security_policy` table: exists with RLS, auto-insert trigger, supports extension for `ai_api_key`, `ai_provider`, `monthly_ai_budget_cents`.

## Plans

The phase is split into 3 plans:

### 06-01: Hybrid Search Engine
- Install `openai` npm package.
- Create `apps/web/lib/ai/` directory with: `client.ts` (OpenAI client factory from workspace key), `embed.ts` (generate embedding).
- Wire embedding generation on issue create/update (Drizzle action hook).
- Create `apps/web/lib/search/` directory with: `hybrid.ts` (BM25 tsquery + pgvector cosine, RR Fuse ranking), `types.ts` (search types).
- Add Drizzle helpers for hybrid search query in `apps/web/lib/db/queries/search.ts`.
- Migration to add `issue_embeddings` table or update existing `embedding` column approach and pgvector index.
- Add trigger on `issues` table to auto-update `search_vector` on title/description change (if not already).
- pgTAP test for search RLS (same RLS boundary as issues).

### 06-02: Semantic ⌘K & AI Triage
- Refactor `command-palette.tsx` to use hybrid search backend instead of mock Zustand data.
- Add semantic search mode (toggle between navigate/fuzzy and AI semantic).
- Create AI triage dialog on create-issue (auto-suggest assignee, labels, priority, project based on issue title/description).
- Add `apps/web/app/api/ai/triage/route.ts` route handler (OpenAI structured output).
- Triage UI: inline suggestions below issue form fields, click to apply.
- Workspace-level toggle for AI features (opt-in per workspace owner).

### 06-03: Summarize Issue & Cost Management
- "Summarize this issue" action button in issue drawer header.
- Create `apps/web/app/api/ai/summarize/route.ts` route handler.
- Summarize panel: collapsible in issue drawer, shows 3-5 bullet summary of comments + description.
- Cost management: add `ai_api_key`, `ai_provider`, `monthly_ai_budget_cents` columns to `workspace_security_policy` schema.
- Settings UI page under workspace settings for AI key configuration.
- Cost tracking: increment `monthly_ai_spent_cents` per request, block if exceeds budget.
- Budget reset via `pg_cron` monthly cron job.
- Integration test: AI key entry → triage/summarize → cost tracking → budget exhaustion.
