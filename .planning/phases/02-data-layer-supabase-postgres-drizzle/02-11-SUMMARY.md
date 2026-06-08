# Plan 02-11 Summary: Local dev DX + .env.example

**Status:** COMPLETE

**Completed:**
- `apps/web/app/api/db-check/route.ts`: Smoke-test route returning `{ ok: true }` or 503
- `package.json`: `bootstrap` script chains `supabase start && supabase db reset && dev`
- `apps/web/.env.example`: Updated to mirror root `.env.example` with all 6 Supabase vars
- `README.md`: Added "First-time setup" section with prerequisites, bootstrap, URLs, manual alternative, env vars, and verification steps

**Deferred (Docker required):**
- `curl http://localhost:3000/api/db-check` verification
