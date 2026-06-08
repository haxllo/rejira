-- pg_cron: Enable the cron extension for scheduled Postgres jobs.
-- Jobs run inside the database — no external scheduler required.
-- All jobs are idempotent and safe to leave running.

CREATE EXTENSION IF NOT EXISTS pg_cron;
