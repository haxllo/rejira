-- Replica Identity: Set to FULL on the 6 hot tables so UPDATE/DELETE events
-- include the full OLD row. Realtime uses this for RLS-aware authorization —
-- without FULL identity, Realtime cannot evaluate RLS policies on the old row
-- and clients may miss events they're authorized to see.

ALTER TABLE issues REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE saved_views REPLICA IDENTITY FULL;
ALTER TABLE memberships REPLICA IDENTITY FULL;
ALTER TABLE project_members REPLICA IDENTITY FULL;
