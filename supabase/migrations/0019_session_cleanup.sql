-- Migration 0019: Session cleanup cron job
--
-- Cleans up expired Better Auth sessions, verification tokens, and password reset tokens.
-- Runs daily at 04:00 UTC.

CREATE OR REPLACE FUNCTION public.tg_session_cleanup()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Clean up expired sessions (older than 1 day past expiry)
  DELETE FROM auth.session
  WHERE expires_at < now() - INTERVAL '1 day';

  -- Clean up expired verification tokens
  DELETE FROM auth.verification
  WHERE expires_at < now() - INTERVAL '1 day';

  -- Clean up expired password reset tokens (handled by Better Auth, but belt-and-suspenders)
  DELETE FROM auth.verification
  WHERE expires_at < now() - INTERVAL '7 days';

  -- Vacuum auth tables to reclaim space
  ANALYZE auth.session;
  ANALYZE auth.verification;
END;
$$;

-- Schedule the cleanup job if not already scheduled
DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'session-cleanup'
  ) THEN
    PERFORM cron.schedule('session-cleanup', '0 4 * * *', $$SELECT public.tg_session_cleanup();$$);
  END IF;
END;
$outer$;
