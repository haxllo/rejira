-- Migration 0032: GitHub webhook secret
ALTER TABLE workspace_security_policy ADD COLUMN IF NOT EXISTS github_webhook_secret text;
