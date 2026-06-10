import type { Monitor, CheckResult, DbMetrics } from "@/types";
import { getCredential } from "@/lib/db/credentials";

export async function checkDatabase(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  const dbType = monitor.db_type ?? "postgresql";

  if (dbType === "postgresql") {
    return checkPostgres(monitor);
  }

  // For other DB types: basic TCP/HTTP ping only
  return {
    status: "unknown",
    error_msg: `Direct monitoring for ${dbType} not yet implemented. Use server monitor for HTTP-based healthchecks.`,
    checked_at: new Date().toISOString(),
  };
}

async function checkPostgres(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  // Dynamically import pg to avoid bundling issues
  const { Client } = await import("pg");

  const password = await getCredential(monitor.id, "db_password");
  const sslCa = await getCredential(monitor.id, "ssl_ca");
  const sslCert = await getCredential(monitor.id, "ssl_cert");
  const sslKey = await getCredential(monitor.id, "ssl_key");

  if (!password) {
    return {
      status: "unknown",
      error_msg: "No password stored for this database monitor",
      checked_at: new Date().toISOString(),
    };
  }

  // rejectUnauthorized: false to handle self-signed chains (Aiven, etc)
  const sslConfig =
    monitor.db_ssl
      ? {
          rejectUnauthorized: false,
          ca: sslCa ?? undefined,
          cert: sslCert ?? undefined,
          key: sslKey ?? undefined,
        }
      : undefined;

  const client = new Client({
    host: monitor.db_host,
    port: monitor.db_port ?? 5432,
    database: monitor.db_name,
    user: await getCredential(monitor.id, "db_user") ?? undefined,
    password,
    ssl: sslConfig,
    connectionTimeoutMillis: 10_000,
    query_timeout: 10_000,
  });

  const start = Date.now();
  try {
    await client.connect();
    const response_ms = Date.now() - start;

    // Collect DB metrics
    const metricsResult = await client.query(`
      SELECT
        pg_database_size(current_database()) AS size_bytes,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
        version() AS version
    `);

    await client.end();

    const row = metricsResult.rows[0];
    const db_metrics: DbMetrics = {
      size_mb: row.size_bytes ? Math.round(row.size_bytes / 1024 / 1024) : undefined,
      connections: row.active_connections ? parseInt(row.active_connections) : undefined,
      max_connections: row.max_connections ? parseInt(row.max_connections) : undefined,
      version: row.version?.split(" ").slice(0, 2).join(" "),
    };

    let status: CheckResult["status"] = "up";
    if (monitor.alert_on_slow_ms && response_ms > monitor.alert_on_slow_ms) {
      status = "degraded";
    }

    return { status, response_ms, db_metrics, checked_at: new Date().toISOString() };
  } catch (err: unknown) {
    try { await client.end(); } catch {}
    const response_ms = Date.now() - start;
    const error_msg = err instanceof Error ? err.message : "Connection failed";
    return { status: "down", response_ms, error_msg, checked_at: new Date().toISOString() };
  }
}