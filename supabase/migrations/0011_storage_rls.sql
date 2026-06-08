-- Storage RLS Policies: Gating access to the 3 storage buckets.
-- Uses public.current_user_id() and public.current_workspace_ids() from 0002_rls_helpers.sql.
-- Path folder conventions enforce workspace/user scoping at the policy level.

-- Avatars: anyone can read; write only in own folder
CREATE POLICY "avatar_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatar_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::TEXT
  );

CREATE POLICY "avatar_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::TEXT
  );

CREATE POLICY "avatar_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = public.current_user_id()::TEXT
  );

-- Attachments: workspace-scoped read; write requires owner + workspace membership
CREATE POLICY "attachment_read" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1]::BIGINT IN (SELECT public.current_workspace_ids())
  );

CREATE POLICY "attachment_write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1]::BIGINT IN (SELECT public.current_workspace_ids())
    AND owner = auth.uid()
  );

CREATE POLICY "attachment_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'attachments'
    AND owner = auth.uid()
  );

-- Exports: owner-only read and write
CREATE POLICY "export_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND owner = auth.uid());

CREATE POLICY "export_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND owner = auth.uid());
