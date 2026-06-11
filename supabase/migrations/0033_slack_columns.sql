-- Migration 0033: Slack columns
ALTER TABLE workspace_security_policy
  ADD COLUMN IF NOT EXISTS slack_bot_token text,
  ADD COLUMN IF NOT EXISTS slack_signing_secret text,
  ADD COLUMN IF NOT EXISTS slack_team_id text;
