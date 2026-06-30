-- Run this migration before starting the apps in production.
-- In development, set synchronize: true in QueueModule.forRoot() to auto-create the table.

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'done', 'failed');

CREATE TABLE IF NOT EXISTS jobs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name    VARCHAR(128) NOT NULL,
  payload       JSONB        NOT NULL,
  status        job_status   NOT NULL DEFAULT 'pending',
  attempts      INTEGER      NOT NULL DEFAULT 0,
  max_retries   INTEGER      NOT NULL DEFAULT 3,
  locked_at     TIMESTAMPTZ,
  worker_id     VARCHAR(128),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  result        JSONB
);

-- Partial index for the SKIP LOCKED claim query — only scans 'pending' rows
CREATE INDEX IF NOT EXISTS idx_jobs_claim
  ON jobs (queue_name, status, created_at)
  WHERE status = 'pending';

-- Partial index for the stale job recovery query — only scans 'processing' rows
CREATE INDEX IF NOT EXISTS idx_jobs_recovery
  ON jobs (status, locked_at)
  WHERE status = 'processing';

-- Migración incremental (bases existentes):
-- ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id VARCHAR(128);
