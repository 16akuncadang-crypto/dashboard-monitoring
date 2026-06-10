import type { Monitor, CheckResult } from "@/types";
import { checkServer } from "./checkers/server";
import { checkDatabase } from "./checkers/database";
import { checkApi } from "./checkers/api";
import {
  getAllEnabledMonitors,
  insertCheckResult,
  getOpenIncident,
  openIncident,
  resolveIncident,
  markIncidentNotified,
  pruneOldResults,
} from "./db/queries";
import { getChannelsForMonitor } from "./db/users";
import { sendDownAlert, sendRecoveryAlert } from "./notifications/email";

export async function runAllChecks(): Promise<{
  checked: number;
  errors: number;
}> {
  const monitors = await getAllEnabledMonitors();
  let errors = 0;

  // Run all checks in parallel (with concurrency limit)
  const CONCURRENCY = 10;
  for (let i = 0; i < monitors.length; i += CONCURRENCY) {
    const batch = monitors.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((m) => runSingleCheck(m).catch(() => errors++)));
  }

  // Prune old results (best-effort)
  pruneOldResults().catch(console.error);

  return { checked: monitors.length, errors };
}

export async function runSingleCheck(monitor: Monitor): Promise<void> {
  let result: Omit<CheckResult, "id" | "monitor_id">;

  try {
    switch (monitor.type) {
      case "server":
        result = await checkServer(monitor);
        break;
      case "database":
        result = await checkDatabase(monitor);
        break;
      case "api_generic":
      case "api_ai":
      case "api_header_quota":
        result = await checkApi(monitor);
        break;
      default:
        result = { status: "unknown", error_msg: "Unknown monitor type", checked_at: new Date().toISOString() };
    }
  } catch (err: unknown) {
    result = {
      status: "down",
      error_msg: err instanceof Error ? err.message : "Check failed",
      checked_at: new Date().toISOString(),
    };
  }

  // Persist result
  await insertCheckResult({ monitor_id: monitor.id, ...result });

  // Incident management + notifications
  await handleIncidents(monitor, result);
}

async function handleIncidents(
  monitor: Monitor,
  result: Omit<CheckResult, "id" | "monitor_id">
): Promise<void> {
  const openIncidentRecord = await getOpenIncident(monitor.id);

  if (result.status === "down" || result.status === "degraded") {
    if (!openIncidentRecord) {
      // New incident
      const incident = await openIncident(
        monitor.id,
        result.error_msg ?? `Status: ${result.status}`
      );

      if (monitor.alert_on_down) {
        const channels = await getChannelsForMonitor(monitor.id);
        for (const channel of channels) {
          try {
            await sendDownAlert(channel, monitor, result.error_msg);
            await markIncidentNotified(incident.id);
          } catch (e) {
            console.error("Failed to send alert:", e);
          }
        }
      }
    }
  } else if (result.status === "up") {
    if (openIncidentRecord) {
      // Recovery
      await resolveIncident(monitor.id);

      if (monitor.alert_on_down) {
        const channels = await getChannelsForMonitor(monitor.id);
        for (const channel of channels) {
          try {
            await sendRecoveryAlert(channel, monitor, openIncidentRecord.started_at);
          } catch (e) {
            console.error("Failed to send recovery alert:", e);
          }
        }
      }
    }
  }
}
