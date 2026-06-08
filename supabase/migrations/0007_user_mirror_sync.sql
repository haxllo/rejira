-- User mirror sync: Copies auth.users rows to public.users.
-- Phase 3 (Better Auth) populates auth.users; this trigger keeps public.users in sync.
-- Only copies safe fields (external_id, email, name) — never passwords or sensitive metadata.

CREATE OR REPLACE FUNCTION public.tg_user_mirror_sync()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (external_id, email, name, status)
  VALUES (NEW.id::TEXT, NEW.email, COALESCE(NEW.name, ''), 'online')
  ON CONFLICT (external_id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(EXCLUDED.name, public.users.name),
      updated_at = now();
  RETURN NEW;
END;
$$;

-- The trigger fires after INSERT or UPDATE on auth.users.
-- In Phase 2, auth.users doesn't exist yet (Better Auth creates it in Phase 3).
-- The trigger definition is valid; it simply never fires until Phase 3.
-- CREATE TRIGGER tg_user_mirror_sync AFTER INSERT OR UPDATE ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION tg_user_mirror_sync();
