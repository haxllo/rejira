-- Per-workspace security policies: 2FA enforcement, domain restrictions, session age limits.
-- Only workspace admins/owners can modify these policies (enforced via RLS).

CREATE TABLE IF NOT EXISTS workspace_security_policy (
  workspace_id BIGINT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  require_2fa_for_admins BOOLEAN NOT NULL DEFAULT FALSE,
  require_2fa_for_members BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_email_domains TEXT[] DEFAULT '{}',
  session_max_age_days INTEGER DEFAULT 7,
  disable_password_signin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at on row change.
CREATE OR REPLACE FUNCTION update_workspace_security_policy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspace_security_policy_updated_at
  BEFORE UPDATE ON workspace_security_policy
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_security_policy_updated_at();

-- RLS: only workspace admins can read/write this table.
ALTER TABLE workspace_security_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage workspace security policy"
  ON workspace_security_policy
  FOR ALL
  USING (public.is_admin(workspace_id));

-- Insert a default row when a workspace is created.
CREATE OR REPLACE FUNCTION create_default_workspace_security_policy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_security_policy (workspace_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workspace_security_policy_default
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace_security_policy();
