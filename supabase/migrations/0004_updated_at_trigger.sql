-- updated_at trigger: Auto-sets updated_at = now() on every row update.
-- Applies to every table with an updated_at column.

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_workspaces BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_memberships BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_labels BEFORE UPDATE ON labels FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_issues BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_cycles BEFORE UPDATE ON cycles FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_comments BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
CREATE TRIGGER set_updated_at_saved_views BEFORE UPDATE ON saved_views FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();
