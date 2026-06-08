-- HNSW Index: Fast approximate nearest neighbor search on issues.embedding.
-- m = 16 (default, balances build speed and recall)
-- ef_construction = 64 (trades build time for recall)
-- Phase 6 sets ef_search per-query in the Drizzle client.

CREATE INDEX IF NOT EXISTS issues_embedding_hnsw ON issues
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
