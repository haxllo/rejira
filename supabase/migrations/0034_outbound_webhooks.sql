-- Migration 0034: Outbound webhooks
CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id BIGSERIAL PRIMARY KEY,
  "workspaceId" TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  retry_count INTEGER DEFAULT 3,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_id BIGINT REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
  "workspaceId" TEXT NOT NULL,
  event TEXT NOT NULL,
  status INTEGER NOT NULL,
  response TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_workspace ON outbound_webhooks("workspaceId");
CREATE INDEX IF NOT EXISTS idx_webhook_logs_workspace ON webhook_logs("workspaceId");
