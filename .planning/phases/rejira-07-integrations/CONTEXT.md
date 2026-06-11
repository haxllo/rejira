# Phase 7: Integrations — Context

## Goal
GitHub PR ↔ issue linking, Slack DM on assignment, outbound webhooks per event, file uploads with previews, data export, public REST API.

## Dependencies
- Phase 6 (Search & AI) — complete. Issues, workspaces, projects all migrated to Drizzle.
- External services: GitHub (webhooks), Slack (Bot token), Supabase Storage (file uploads), Resend (email export)

## Existing Infrastructure
- Supabase Storage not yet wired (no bucket policies, no signed URL helpers)
- Resend integration exists (Phase 3 email)
- Better Auth sessions and workspace context available
- `withWorkspaceTransaction` and `requireAuth` helpers exist
- Drizzle actions for all CRUD operations exist

## Plans

### 07-01: GitHub PR ↔ Issue Linking
- Create `/api/webhooks/github/route.ts` — handle `pull_request` events
- Match PR title/body to issue key (`ENG-123` pattern) via regex
- Link PR to issue via `issue_links` table or comment on the issue
- Webhook verification via GitHub HMAC secret stored per-workspace
- Add `github_webhook_secret` column to `workspace_security_policy`
- Test: webhook with matching title links within 30s

### 07-02: Slack DM on Assignment
- Create `/api/webhooks/slack/route.ts` — Slack command/event handler
- On `setAssignees` action, send Slack DM to newly assigned user via webhook
- Need: Slack Bot token, Signing secret, workspace mapping for Slack workspace ID
- Add `slack_bot_token`, `slack_signing_secret` columns to `workspace_security_policy`
- Use the Slack Web API (`@slack/web-api` npm package)
- DM: `🔔 You've been assigned ENG-123: Fix login bug` with deep link

### 07-03: Outbound Webhooks
- Create `/api/webhooks/outbound/route.ts` — webhook delivery endpoint
- Create webhook configuration UI in workspace settings
- Events: issue.created, issue.updated, issue.commented, issue.status_changed, member.added
- Each webhook has: URL, signing secret, event filter, retry config
- Delivery: POST with HMAC-SHA256 signature header, retry 3x with exponential backoff
- Add `outbound_webhooks` table with Drizzle schema
- Add webhook log table for delivery status

### 07-04: File Uploads (Supabase Storage)
- Create Supabase Storage bucket `attachments` with RLS policy
- Create `/api/storage/upload/route.ts` — presigned URL generation
- Create `/api/storage/delete/route.ts` — file deletion
- Add file preview in issue drawer (image thumbnails, file icon for docs)
- Drag-and-drop zone in create-issue dialog and issue drawer
- File size limit (10MB), allowed MIME types
- `attachments` table already exists in Drizzle schema — wire it up

### 07-05: Data Export
- Create `/api/export/issues/route.ts` — CSV generation
- Create `/api/export/issues/json/route.ts` — JSON generation
- Batch processing for large exports (1k issues)
- Email completed export via Resend
- Export progress UI with async status polling
- Add `exports` table (status, type, url, requested_at, completed_at)

### 07-06: Public REST API
- Create `/api/v1/issues/route.ts` — list, create, update, delete
- Create `/api/v1/projects/route.ts` — list
- Token-based auth (API tokens stored in `api_tokens` table)
- Rate limiting via Upstash Redis (100 req/min per token)
- OpenAPI/Swagger docs at `/api/v1/docs`
- 5 mutations: create issue, update status, add comment, list projects, get issue
- Each mutation rate-limited, authenticated, and logged

## Required API Keys (ask user)
- GitHub webhook secret
- Slack Bot Token + Signing Secret
- Supabase Storage already configured (Project URL + Anon Key in env)
- Resend API key (already configured from Phase 3)
