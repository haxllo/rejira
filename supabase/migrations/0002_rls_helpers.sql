-- RLS Helper Functions
-- These are SECURITY DEFINER so RLS policies can call them without the caller's privileges.
-- All helpers set search_path to public for security (prevents search_path injection).

-- Returns the current authenticated user's internal BIGINT id.
-- Better Auth sets `auth.jwt() ->> 'sub'` to the user's external_id.
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE external_id = auth.jwt() ->> 'sub'
$$;

-- Returns all workspace ids the current user is a member of.
CREATE OR REPLACE FUNCTION public.current_workspace_ids()
RETURNS SETOF BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.memberships WHERE user_id = public.current_user_id()
$$;

-- Returns the role of the current user in a given workspace.
CREATE OR REPLACE FUNCTION public.current_role(workspace_id BIGINT)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.memberships
  WHERE user_id = public.current_user_id() AND workspace_id = $1
$$;

-- Returns TRUE if the current user is an owner or admin in the given workspace.
CREATE OR REPLACE FUNCTION public.is_admin(workspace_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role IN ('owner', 'admin') FROM public.memberships
  WHERE user_id = public.current_user_id() AND workspace_id = $1
$$;

-- Test impersonation helper: sets the current user's external_id via request.jwt.claims.
-- Only callable by the service_role (tests use the service_role key to impersonate).
CREATE OR REPLACE FUNCTION public.set_user(external_id TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', external_id)::TEXT, true);
END;
$$;
