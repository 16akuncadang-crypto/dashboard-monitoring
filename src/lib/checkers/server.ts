import type { Monitor, CheckResult } from "@/types";

export async function checkServer(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  if (!monitor.url) {
    return { status: "unknown", error_msg: "No URL configured", checked_at: new Date().toISOString() };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(monitor.url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MonitoringDashboard/1.0" },
    });
    clearTimeout(timeout);

    const response_ms = Date.now() - start;
    const status_code = res.status;

    let status: CheckResult["status"] = "up";
    if (status_code >= 500) status = "down";
    else if (status_code >= 400) status = "degraded";
    else if (monitor.alert_on_slow_ms && response_ms > monitor.alert_on_slow_ms) {
      status = "degraded";
    }

    return { status, response_ms, status_code, checked_at: new Date().toISOString() };
  } catch (err: unknown) {
    const response_ms = Date.now() - start;
    const error_msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timeout after 15s"
          : err.message
        : "Unknown error";
    return { status: "down", response_ms, error_msg, checked_at: new Date().toISOString() };
  }
}
