-- Migration 0018: GDPR hard-delete cron function + scheduled_hard_delete_at column
--
-- Adds scheduled_hard_delete_at column to public.users for soft-delete tracking.
-- Implements the tg_gdpr_hard_delete() function body (replaces stub from 0017).
-- Scheduled daily at 03:00 UTC.

-- Add column for tracking when hard-delete should occur
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scheduled_hard_delete_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.scheduled_hard_delete_at IS 'When the hard-delete cron job should permanently remove this user (30 days after soft-delete)';
COMMENT ON COLUMN public.users.deleted_at IS 'When the user initiated account deletion (soft-delete timestamp)';

-- Replace the stub function with the real implementation
CREATE OR REPLACE FUNCTION public.tg_gdpr_hard_delete()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_user RECORD;
BEGIN
  FOR deleted_user IN
    SELECT id, external_id, email
    FROM public.users
    WHERE status = 'deleted'
      AND scheduled_hard_delete_at IS NOT NULL
      AND scheduled_hard_delete_at < now()
  LOOP
    -- Write final audit event before deletion
    INSERT INTO public.audit_log (actor_id, event, metadata, created_at)
    VALUES (
      deleted_user.id,
      'account_deleted',
      jsonb_build_object(
        'external_id', deleted_user.external_id,
        'email', deleted_user.email,
        'hard_deleted_at', now()
      ),
      now()
    );

    -- Hard-delete from public schema (cascading to memberships, etc.)
    DELETE FROM public.users WHERE id = deleted_user.id;
  END LOOP;
END;
$$;
