-- Run this migration before starting the apps in production.
-- In development, set synchronize: true in QueueModule.forRoot() to auto-create the table.

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'done', 'failed');

CREATE TABLE IF NOT EXISTS jobs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "queueName"    VARCHAR(128) NOT NULL,
  payload        JSONB        NOT NULL,
  status         job_status   NOT NULL DEFAULT 'pending',
  attempts       INTEGER      NOT NULL DEFAULT 0,
  "maxRetries"   INTEGER      NOT NULL DEFAULT 3,
  "lockedAt"     TIMESTAMPTZ,
  "workerId"     VARCHAR(128),
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "processedAt"  TIMESTAMPTZ,
  "errorMessage" TEXT,
  result         JSONB
);

-- Partial index for the SKIP LOCKED claim query — only scans 'pending' rows
CREATE INDEX IF NOT EXISTS idx_jobs_claim
  ON jobs ("queueName", status, "createdAt")
  WHERE status = 'pending';

-- Partial index for the stale job recovery query — only scans 'processing' rows
CREATE INDEX IF NOT EXISTS idx_jobs_recovery
  ON jobs (status, "lockedAt")
  WHERE status = 'processing';

-- Migración incremental (bases existentes): renombrar columnas snake_case a camelCase.
-- ALTER TABLE jobs RENAME COLUMN queue_name TO "queueName";
-- ALTER TABLE jobs RENAME COLUMN max_retries TO "maxRetries";
-- ALTER TABLE jobs RENAME COLUMN locked_at TO "lockedAt";
-- ALTER TABLE jobs RENAME COLUMN worker_id TO "workerId";
-- ALTER TABLE jobs RENAME COLUMN created_at TO "createdAt";
-- ALTER TABLE jobs RENAME COLUMN processed_at TO "processedAt";
-- ALTER TABLE jobs RENAME COLUMN error_message TO "errorMessage";
