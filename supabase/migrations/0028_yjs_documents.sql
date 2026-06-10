-- Yjs document state persistence for collaborative editing.
-- Stores CRDT document state (encoded as TEXT) per room.
-- Room format: "issue:description:<workspaceId>:<issueExternalId>"

CREATE TABLE IF NOT EXISTS public.yjs_documents (
  room TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yjs_documents ENABLE ROW LEVEL SECURITY;

-- Workspace members can read/write Yjs docs.
-- The workspace ID is extracted from the room name (third segment).
CREATE POLICY "workspace_members_can_access_yjs_docs"
  ON public.yjs_documents
  FOR ALL
  USING (
    SPLIT_PART(room, ':', 3)::uuid IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    SPLIT_PART(room, ':', 3)::uuid IN (
      SELECT workspace_id FROM memberships WHERE user_id = auth.uid()::text
    )
  );
