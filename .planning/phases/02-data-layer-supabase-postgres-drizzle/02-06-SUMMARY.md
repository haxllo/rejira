# Plan 02-06 Summary: Storage buckets + RLS

**Status:** COMPLETE (config/code; runtime verification deferred — Docker required)

**Completed:**
- `supabase/migrations/0010_storage_buckets.sql`: 3 buckets (avatars 2MB, attachments 50MB, exports 100MB)
- `supabase/migrations/0011_storage_rls.sql`: 9 storage RLS policies (avatar read/write/update/delete, attachment read/write/delete, export read/write)
- `apps/web/lib/supabase/storage.ts`: TypeScript helper with `signedUrl()`, `uploadFile()`, `deleteFile()` — size validation, MIME checks, server-client usage

**Deferred (Docker required):**
- `npm run db:reset` to apply storage migrations
- Cross-workspace RLS denial verification via `psql`
