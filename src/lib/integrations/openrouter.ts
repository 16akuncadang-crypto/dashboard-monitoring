import type { Monitor, CheckResult, QuotaSnapshot } from "@/types";
import { getCredential } from "@/lib/db/credentials";

export async function checkOpenRouter(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  const apiKey = await getCredential(monitor.id, "api_key");
  if (!apiKey) {
    return {
      status: "unknown",
      error_msg: "No API key stored",
      checked_at: new Date().toISOString(),
    };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "MonitoringDashboard/1.0",
      },
    });

    const response_ms = Date.now() - start;

    if (!res.ok) {
      return {
        status: res.status === 401 ? "down" : "degraded",
        response_ms,
        status_code: res.status,
        error_msg: `HTTP ${res.status}`,
        checked_at: new Date().toISOString(),
      };
    }

    const data = await res.json();
    // OpenRouter response shape:
    // { data: { label, usage, limit, limit_remaining, rate_limit: { requests, interval } } }
    const d = data?.data ?? {};

    const quota: QuotaSnapshot = {};

    // Credits
    if (d.limit !== undefined) quota.credits_limit_usd = d.limit;
    if (d.usage !== undefined) {
      quota.credits_usd = d.limit !== undefined
        ? parseFloat((d.limit - d.usage).toFixed(4))
        : undefined;
    }
    if (d.limit_remaining !== undefined) {
      quota.credits_usd = parseFloat(d.limit_remaining.toFixed(4));
    }

    // Rate limit
    if (d.rate_limit) {
      quota.rpm_limit = d.rate_limit.requests;
    }

    let status: CheckResult["status"] = "up";

    // Warn if credits running low
    if (
      quota.credits_usd !== undefined &&
      quota.credits_limit_usd !== undefined &&
      quota.credits_limit_usd > 0
    ) {
      const pct = (quota.credits_usd / quota.credits_limit_usd) * 100;
      if (pct < monitor.alert_quota_pct) status = "degraded";
    }

    return {
      status,
      response_ms,
      status_code: res.status,
      quota,
      checked_at: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const response_ms = Date.now() - start;
    return {
      status: "down",
      response_ms,
      error_msg: err instanceof Error ? err.message : "Unknown error",
      checked_at: new Date().toISOString(),
    };
  }
}
