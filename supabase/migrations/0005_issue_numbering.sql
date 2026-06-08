-- Issue numbering: Assigns sequential key/number per project.
-- Uses SELECT FOR UPDATE on the project row to serialise concurrent inserts.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_issue_number INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.tg_assign_issue_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p_key TEXT;
  p_next INTEGER;
BEGIN
  SELECT key, next_issue_number INTO p_key, p_next
  FROM projects
  WHERE id = NEW.project_id
  FOR UPDATE;

  NEW.number := p_next;
  NEW.key := UPPER(p_key) || '-' || LPAD(p_next::TEXT, 4, '0');

  UPDATE projects SET next_issue_number = p_next + 1 WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_assign_issue_number
  BEFORE INSERT ON issues
  FOR EACH ROW
  WHEN (NEW.number IS NULL)
  EXECUTE FUNCTION tg_assign_issue_number();
