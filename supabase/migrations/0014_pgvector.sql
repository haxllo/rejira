-- pgvector: Enable the vector extension for semantic search (Phase 6).
-- The issues.embedding column was created in the Drizzle migration (0000).
-- This migration just enables the extension so the column type resolves.

CREATE EXTENSION IF NOT EXISTS vector;
