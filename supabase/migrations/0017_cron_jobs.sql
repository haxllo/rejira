-- Cron Jobs: 4 scheduled housekeeping jobs.
-- Function bodies are stubs in Phase 2; Phase 4/6/7 implement them.

-- GDPR hard-delete: Purges accounts soft-deleted 30+ days ago (Phase 4 implements the body)
CREATE OR REPLACE FUNCTION public.tg_gdpr_hard_delete()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Phase 4: DELETE FROM users WHERE deleted_at < now() - INTERVAL '30 days'
  -- Phase 4: Log each deletion to audit_log before the actual DELETE
  RETURN;
END;
$$;

-- Embedding refresh: Recomputes embeddings for issues modified in the last 6 hours (Phase 6 implements)
CREATE OR REPLACE FUNCTION public.tg_embedding_refresh()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Phase 6: SELECT issues updated in last interval, call embedding service, UPDATE issues.embedding
  RETURN;
END;
$$;

-- Orphan attachment cleanup: Deletes storage files whose attachment rows were deleted (Phase 7 implements)
CREATE OR REPLACE FUNCTION public.tg_orphan_attachment_cleanup()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Phase 7: Find storage.objects without matching attachments rows and delete them
  RETURN;
END;
$$;

SELECT cron.schedule('gdpr-hard-delete', '0 3 * * *', $$SELECT public.tg_gdpr_hard_delete();$$);
SELECT cron.schedule('embedding-refresh', '0 */6 * * *', $$SELECT public.tg_embedding_refresh();$$);
SELECT cron.schedule('orphan-attachment-cleanup', '0 4 * * 0', $$SELECT public.tg_orphan_attachment_cleanup();$$);
SELECT cron.schedule('issues-vacuum', '0 2 * * *', $$VACUUM ANALYZE issues;$$);
