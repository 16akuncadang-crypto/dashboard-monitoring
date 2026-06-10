-- ============================================================
-- Monitoring Dashboard — Database Schema
-- Run this once against your Neon/Supabase/PostgreSQL database
-- ============================================================

-- Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT,
  password     TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'viewer',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Monitors
CREATE TABLE IF NOT EXISTS monitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  url           TEXT,
  interval_sec  INT NOT NULL DEFAULT 60,
  vendor        TEXT,
  api_label     TEXT,
  quota_headers JSONB,
  db_type       TEXT,
  db_host       TEXT,
  db_port       INT,
  db_name       TEXT,
  db_ssl        BOOLEAN DEFAULT FALSE,
  alert_on_down          BOOLEAN DEFAULT TRUE,
  alert_on_slow_ms       INT,
  alert_quota_pct        INT DEFAULT 20,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Encrypted credentials per monitor
CREATE TABLE IF NOT EXISTS monitor_credentials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id    UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  key_name      TEXT NOT NULL,
  encrypted_val TEXT NOT NULL,
  iv            TEXT NOT NULL,
  auth_tag      TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(monitor_id, key_name)
);

-- Check results (time-series, pruned after 7 days)
CREATE TABLE IF NOT EXISTS check_results (
  id            BIGSERIAL PRIMARY KEY,
  monitor_id    UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ DEFAULT NOW(),
  status        TEXT NOT NULL,
  response_ms   INT,
  status_code   INT,
  error_msg     TEXT,
  quota         JSONB,
  db_metrics    JSONB
);

CREATE INDEX IF NOT EXISTS idx_check_results_monitor_time
  ON check_results(monitor_id, checked_at DESC);

-- Incidents (down events)
-- duration_sec dihitung manual saat resolve (bukan generated column)
-- karena NOW() tidak immutable di PostgreSQL generated columns
CREATE TABLE IF NOT EXISTS incidents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id    UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  duration_sec  INT,
  cause         TEXT,
  notified      BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_incidents_monitor
  ON incidents(monitor_id, started_at DESC);

-- Notification channels
CREATE TABLE IF NOT EXISTS notification_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'email',
  config      JSONB NOT NULL,
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Monitor <-> notification channel mapping
CREATE TABLE IF NOT EXISTS monitor_notifications (
  monitor_id  UUID NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
  PRIMARY KEY (monitor_id, channel_id)
);