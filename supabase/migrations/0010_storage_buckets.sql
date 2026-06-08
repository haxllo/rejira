-- Storage Buckets: Create the 3 Supabase Storage buckets for avatars, attachments, and exports.
-- Path conventions:
--   avatars/{user_external_id}/filename
--   attachments/{workspace_id}/{issue_id}/{uuid}.{ext}
--   exports/{user_external_id}/{workspace_id}/{export_id}.csv

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('attachments', 'attachments', FALSE, 52428800, NULL),
  ('exports', 'exports', FALSE, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;
