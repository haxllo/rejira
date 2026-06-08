-- Full-text search: search_vector column on issues for BM25 text search.
-- GENERATED ALWAYS AS STORED so it auto-updates on INSERT/UPDATE.
-- GIN index enables fast `ts_query` lookups (Phase 6 hybrid search uses this + pgvector).

ALTER TABLE issues ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(key, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS issues_search_vector_idx ON issues USING GIN (search_vector);
