export type MonitorType =
  | "server"
  | "database"
  | "api_generic"
  | "api_ai"
  | "api_header_quota";

export type MonitorStatus = "up" | "down" | "degraded" | "unknown";

export type DbType = "postgresql" | "mysql" | "redis" | "mongodb";

export type Vendor =
  | "openrouter"
  | "openai"
  | "groq"
  | "anthropic"
  | "stripe"
  | "twilio"
  | "sendgrid"
  | "github"
  | "custom";

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  type: MonitorType;
  enabled: boolean;
  url?: string;
  interval_sec: number;
  vendor?: Vendor;
  api_label?: string;
  quota_headers?: QuotaHeaderConfig;
  db_type?: DbType;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_ssl?: boolean;
  alert_on_down: boolean;
  alert_on_slow_ms?: number;
  alert_quota_pct: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  latest_status?: MonitorStatus;
  latest_checked_at?: string;
  latest_response_ms?: number;
  latest_quota?: QuotaSnapshot;
  latest_db_metrics?: DbMetrics;
}

export interface QuotaHeaderConfig {
  remaining?: string;
  limit?: string;
  remaining_tokens?: string;
  limit_tokens?: string;
  reset?: string;
  used?: string;
}

export interface QuotaSnapshot {
  rpm_remaining?: number;
  rpm_limit?: number;
  rpd_remaining?: number;
  rpd_limit?: number;
  tokens_remaining?: number;
  tokens_limit?: number;
  credits_usd?: number;
  credits_limit_usd?: number;
  // Generic header-based
  [key: string]: number | undefined;
}

export interface DbMetrics {
  size_mb?: number;
  connections?: number;
  max_connections?: number;
  lag_ms?: number;
  version?: string;
}

export interface CheckResult {
  id: number;
  monitor_id: string;
  checked_at: string;
  status: MonitorStatus;
  response_ms?: number;
  status_code?: number;
  error_msg?: string;
  quota?: QuotaSnapshot;
  db_metrics?: DbMetrics;
}

export interface Incident {
  id: string;
  monitor_id: string;
  started_at: string;
  resolved_at?: string;
  duration_sec?: number;
  cause?: string;
  notified: boolean;
  monitor_name?: string;
}

export interface NotificationChannel {
  id: string;
  user_id: string;
  name: string;
  type: "email";
  config: { to: string };
  enabled: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "viewer";
}

export interface DashboardSummary {
  total: number;
  up: number;
  down: number;
  degraded: number;
  unknown: number;
  active_incidents: number;
}
