-- Activity log triggers: Emits an activities row on INSERT/UPDATE/DELETE
-- on the 7 most important business tables. Only fires on UPDATE when updated_at changed.

CREATE OR REPLACE FUNCTION public.tg_emit_activity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_verb TEXT;
  v_before JSONB;
  v_after JSONB;
  v_ws_id BIGINT;
  v_obj_type TEXT;
BEGIN
  v_obj_type := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    v_verb := 'created';
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.updated_at = NEW.updated_at THEN
      RETURN NULL;
    END IF;
    v_verb := 'updated';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_verb := 'deleted';
    v_before := to_jsonb(OLD);
    v_after := NULL;
  END IF;

  IF TG_TABLE_NAME = 'issues' THEN
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'comments' THEN
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'projects' THEN
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'cycles' THEN
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSIF TG_TABLE_NAME = 'labels' THEN
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  ELSE
    v_ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
  END IF;

  INSERT INTO activities (external_id, workspace_id, actor_id, verb, object_type, object_id, before, after)
  VALUES (
    'act_' || gen_random_uuid()::TEXT,
    v_ws_id,
    public.current_user_id(),
    v_verb::activity_verb,
    v_obj_type,
    COALESCE(NEW.id, OLD.id),
    v_before,
    v_after
  );

  RETURN NULL;
END;
$$;

CREATE TRIGGER tg_emit_activity_issues AFTER INSERT OR UPDATE OR DELETE ON issues FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_comments AFTER INSERT OR UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_memberships AFTER INSERT OR UPDATE OR DELETE ON memberships FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_cycles AFTER INSERT OR UPDATE OR DELETE ON cycles FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_labels AFTER INSERT OR UPDATE OR DELETE ON labels FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
CREATE TRIGGER tg_emit_activity_saved_views AFTER INSERT OR UPDATE OR DELETE ON saved_views FOR EACH ROW EXECUTE FUNCTION tg_emit_activity();
