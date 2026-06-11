-- Migration 0029: pgvector index and match function for semantic search

-- Create IVFFlat index on embedding for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_issues_embedding
  ON issues
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Function to match issues by embedding similarity
CREATE OR REPLACE FUNCTION match_issues_by_embedding(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  p_workspace_id text DEFAULT NULL
)
RETURNS TABLE(
  id text,
  title text,
  description text,
  status text,
  priority text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.external_id,
    i.title,
    i.description,
    i.status,
    i.priority,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM issues i
  WHERE i.embedding IS NOT NULL
    AND (p_workspace_id IS NULL OR i.workspace_id = p_workspace_id)
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
