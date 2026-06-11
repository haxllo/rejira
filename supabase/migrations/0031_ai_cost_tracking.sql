-- Migration 0031: AI cost tracking columns for workspace_security_policy

ALTER TABLE workspace_security_policy
  ADD COLUMN IF NOT EXISTS ai_api_key text,
  ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'openai',
  ADD COLUMN IF NOT EXISTS monthly_ai_budget_cents integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS monthly_ai_spent_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_budget_reset_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ai_features_enabled boolean DEFAULT true;

-- pg_cron job to reset monthly spending on the 1st of each month
SELECT cron.schedule(
  'reset-ai-budget',
  '0 0 1 * *',
  $$UPDATE workspace_security_policy SET monthly_ai_spent_cents = 0, ai_budget_reset_at = NOW();$$
);
