-- Migration 0030: tsvector trigger for auto-updating search_vector

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_issues_search_vector
  BEFORE INSERT OR UPDATE OF title, description ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();
