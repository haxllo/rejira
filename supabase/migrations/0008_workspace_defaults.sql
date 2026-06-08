-- Workspace defaults: workflow_statuses table for per-workspace custom statuses.
-- Empty in Phase 2; Phase 4 populates per-workspace from a default template.

CREATE TABLE IF NOT EXISTS workflow_statuses (
  id BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE workflow_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_statuses_all" ON workflow_statuses
  FOR ALL USING (workspace_id IN (SELECT public.current_workspace_ids()));
