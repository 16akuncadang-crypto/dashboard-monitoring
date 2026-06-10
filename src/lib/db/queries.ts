import { query, queryOne } from "./client";
import type { Monitor, CheckResult, Incident, DashboardSummary } from "@/types";

// ── Monitors ────────────────────────────────────────────────

export async function getMonitors(userId: string): Promise<Monitor[]> {
  return query<Monitor>(
    `SELECT m.*,
       cr.status      AS latest_status,
       cr.checked_at  AS latest_checked_at,
       cr.response_ms AS latest_response_ms,
       cr.quota       AS latest_quota,
       cr.db_metrics  AS latest_db_metrics
     FROM monitors m
     LEFT JOIN LATERAL (
       SELECT status, checked_at, response_ms, quota, db_metrics
       FROM check_results
       WHERE monitor_id = m.id
       ORDER BY checked_at DESC LIMIT 1
     ) cr ON TRUE
     WHERE m.user_id = $1
     ORDER BY m.created_at ASC`,
    [userId]
  );
}

export async function getMonitorById(id: string): Promise<Monitor | null> {
  return queryOne<Monitor>(
    `SELECT m.*,
       cr.status      AS latest_status,
       cr.checked_at  AS latest_checked_at,
       cr.response_ms AS latest_response_ms,
       cr.quota       AS latest_quota,
       cr.db_metrics  AS latest_db_metrics
     FROM monitors m
     LEFT JOIN LATERAL (
       SELECT status, checked_at, response_ms, quota, db_metrics
       FROM check_results
       WHERE monitor_id = m.id
       ORDER BY checked_at DESC LIMIT 1
     ) cr ON TRUE
     WHERE m.id = $1`,
    [id]
  );
}

export async function getAllEnabledMonitors(): Promise<Monitor[]> {
  return query<Monitor>(
    `SELECT m.*,
       cr.status      AS latest_status,
       cr.checked_at  AS latest_checked_at,
       cr.response_ms AS latest_response_ms,
       cr.quota       AS latest_quota,
       cr.db_metrics  AS latest_db_metrics
     FROM monitors m
     LEFT JOIN LATERAL (
       SELECT status, checked_at, response_ms, quota, db_metrics
       FROM check_results
       WHERE monitor_id = m.id
       ORDER BY checked_at DESC LIMIT 1
     ) cr ON TRUE
     WHERE m.enabled = TRUE
     ORDER BY m.created_at ASC`
  );
}

export async function createMonitor(
  data: Omit<Monitor, "id" | "created_at" | "updated_at">
): Promise<Monitor> {
  const rows = await query<Monitor>(
    `INSERT INTO monitors
       (user_id, name, type, enabled, url, interval_sec, vendor, api_label,
        quota_headers, db_type, db_host, db_port, db_name, db_ssl,
        alert_on_down, alert_on_slow_ms, alert_quota_pct)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     RETURNING *`,
    [
      data.user_id, data.name, data.type, data.enabled ?? true,
      data.url ?? null, data.interval_sec ?? 60,
      data.vendor ?? null, data.api_label ?? null,
      data.quota_headers ? JSON.stringify(data.quota_headers) : null,
      data.db_type ?? null, data.db_host ?? null,
      data.db_port ?? null, data.db_name ?? null, data.db_ssl ?? false,
      data.alert_on_down ?? true, data.alert_on_slow_ms ?? null,
      data.alert_quota_pct ?? 20,
    ]
  );
  return rows[0];
}

export async function updateMonitor(
  id: string,
  data: Partial<Monitor>
): Promise<Monitor | null> {
  const fields = Object.entries(data)
    .filter(([k]) => !["id", "created_at", "updated_at"].includes(k))
    .map(([k], i) => `${k} = $${i + 2}`);
  const values = Object.entries(data)
    .filter(([k]) => !["id", "created_at", "updated_at"].includes(k))
    .map(([, v]) => v);

  if (!fields.length) return getMonitorById(id);

  const rows = await query<Monitor>(
    `UPDATE monitors SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return rows[0] ?? null;
}

export async function deleteMonitor(id: string): Promise<void> {
  await query("DELETE FROM monitors WHERE id = $1", [id]);
}

// ── Check Results ───────────────────────────────────────────

export async function insertCheckResult(data: Omit<CheckResult, "id">): Promise<void> {
  await query(
    `INSERT INTO check_results
       (monitor_id, checked_at, status, response_ms, status_code, error_msg, quota, db_metrics)
     VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
    [
      data.monitor_id, data.status, data.response_ms ?? null,
      data.status_code ?? null, data.error_msg ?? null,
      data.quota ? JSON.stringify(data.quota) : null,
      data.db_metrics ? JSON.stringify(data.db_metrics) : null,
    ]
  );
}

export async function getRecentResults(
  monitorId: string,
  limit = 100
): Promise<CheckResult[]> {
  return query<CheckResult>(
    `SELECT * FROM check_results
     WHERE monitor_id = $1
     ORDER BY checked_at DESC LIMIT $2`,
    [monitorId, limit]
  );
}

export async function pruneOldResults(): Promise<void> {
  await query(
    `DELETE FROM check_results WHERE checked_at < NOW() - INTERVAL '7 days'`
  );
}

// ── Incidents ───────────────────────────────────────────────

export async function getOpenIncident(monitorId: string): Promise<Incident | null> {
  return queryOne<Incident>(
    `SELECT i.*, m.name AS monitor_name FROM incidents i
     JOIN monitors m ON m.id = i.monitor_id
     WHERE i.monitor_id = $1 AND i.resolved_at IS NULL
     ORDER BY i.started_at DESC LIMIT 1`,
    [monitorId]
  );
}

export async function openIncident(
  monitorId: string,
  cause: string
): Promise<Incident> {
  const rows = await query<Incident>(
    `INSERT INTO incidents (monitor_id, cause) VALUES ($1, $2) RETURNING *`,
    [monitorId, cause]
  );
  return rows[0];
}

export async function resolveIncident(monitorId: string): Promise<void> {
  await query(
    `UPDATE incidents
     SET resolved_at = NOW(),
         duration_sec = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
     WHERE monitor_id = $1 AND resolved_at IS NULL`,
    [monitorId]
  );
}

export async function markIncidentNotified(incidentId: string): Promise<void> {
  await query(`UPDATE incidents SET notified = TRUE WHERE id = $1`, [incidentId]);
}

export async function getActiveIncidents(): Promise<Incident[]> {
  return query<Incident>(
    `SELECT i.*, m.name AS monitor_name FROM incidents i
     JOIN monitors m ON m.id = i.monitor_id
     WHERE i.resolved_at IS NULL
     ORDER BY i.started_at DESC`
  );
}

export async function getRecentIncidents(limit = 20): Promise<Incident[]> {
  return query<Incident>(
    `SELECT i.*, m.name AS monitor_name FROM incidents i
     JOIN monitors m ON m.id = i.monitor_id
     ORDER BY i.started_at DESC LIMIT $1`,
    [limit]
  );
}

// ── Dashboard Summary ───────────────────────────────────────

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT cr.status, COUNT(*) AS count
     FROM monitors m
     LEFT JOIN LATERAL (
       SELECT status FROM check_results
       WHERE monitor_id = m.id ORDER BY checked_at DESC LIMIT 1
     ) cr ON TRUE
     WHERE m.user_id = $1 AND m.enabled = TRUE
     GROUP BY cr.status`,
    [userId]
  );

  const counts = { up: 0, down: 0, degraded: 0, unknown: 0 };
  let total = 0;
  for (const row of rows) {
    const s = (row.status ?? "unknown") as keyof typeof counts;
    const n = parseInt(row.count);
    counts[s] = (counts[s] ?? 0) + n;
    total += n;
  }

  const [{ count: activeIncidents }] = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM incidents i
     JOIN monitors m ON m.id = i.monitor_id
     WHERE m.user_id = $1 AND i.resolved_at IS NULL`,
    [userId]
  );

  return { total, ...counts, active_incidents: parseInt(activeIncidents) };
}