-- Realtime Publication: Subscribe the 6 hot tables to supabase_realtime.
-- Realtime's authorization runs the same RLS policies as Postgres — the user's JWT
-- determines what they can subscribe to.
-- Activities and audit_log are excluded (app-internal writes, not subscriber-relevant).

ALTER PUBLICATION supabase_realtime ADD TABLE issues;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE saved_views;
ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE project_members;
