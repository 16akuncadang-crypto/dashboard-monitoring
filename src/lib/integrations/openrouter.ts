import type { Monitor, CheckResult, QuotaSnapshot } from "@/types";
import { getCredential } from "@/lib/db/credentials";

function safeFloat(val: unknown, decimals = 4): number | undefined {
  const n = Number(val);
  if (val === null || val === undefined || isNaN(n)) return undefined;
  return parseFloat(n.toFixed(decimals));
}

export async function checkOpenRouter(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  const apiKey = await getCredential(monitor.id, "api_key");
  const managementKey = await getCredential(monitor.id, "management_api_key");

  if (!apiKey && !managementKey) {
    return {
      status: "unknown",
      error_msg: "No API key stored",
      checked_at: new Date().toISOString(),
    };
  }

  const start = Date.now();
  const quota: QuotaSnapshot = {};

  try {
    // ── 1. SK Key → liveness + rate limit ──────────────────
    if (apiKey) {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "MonitoringDashboard/1.0",
        },
      });

      if (!res.ok) {
        return {
          status: res.status === 401 ? "down" : "degraded",
          response_ms: Date.now() - start,
          status_code: res.status,
          error_msg: `SK key check failed: HTTP ${res.status}`,
          checked_at: new Date().toISOString(),
        };
      }

      const data = await res.json();
      const d = data?.data ?? {};

      // Rate limit from SK key
      if (d.rate_limit?.requests) quota.rpm_limit = d.rate_limit.requests;

      // Credits fallback dari SK key (kalau tidak ada management key)
      if (!managementKey) {
        quota.credits_limit_usd = safeFloat(d.limit);
        if (d.limit != null && d.usage != null) {
          quota.credits_usd = safeFloat(Number(d.limit) - Number(d.usage));
        }
        if (d.limit_remaining != null) {
          quota.credits_usd = safeFloat(d.limit_remaining);
        }
      }
    }

    // ── 2. Management Key → data per key yang akurat ───────
    // Docs: GET /api/v1/keys lists all keys with usage, limit_remaining, etc.
    // Kita match berdasarkan label yang mengandung SK key prefix
    if (managementKey) {
      const keysRes = await fetch("https://openrouter.ai/api/v1/keys", {
        headers: {
          Authorization: `Bearer ${managementKey}`,
          "User-Agent": "MonitoringDashboard/1.0",
        },
      });

      if (keysRes.ok) {
        const keysData = await keysRes.json();
        const keys: Array<Record<string, unknown>> = keysData?.data ?? [];

        // Cari key yang sesuai dengan SK key kita (match via label prefix)
        // label format: "sk-or-v1-abc...123"
        const skPrefix = apiKey ? apiKey.slice(0, 20) : null;
        const matchedKey = skPrefix
          ? keys.find((k) =>
              typeof k.label === "string" && k.label.startsWith(skPrefix)
            ) ?? keys[0] // fallback ke key pertama kalau tidak ada match
          : keys[0];

        if (matchedKey) {
          quota.credits_limit_usd = safeFloat(matchedKey.limit);
          quota.credits_usd = safeFloat(matchedKey.limit_remaining);

          // Usage breakdown
          if (matchedKey.usage_daily != null) {
            (quota as Record<string, unknown>).usage_daily_usd = safeFloat(matchedKey.usage_daily);
          }
          if (matchedKey.usage_monthly != null) {
            (quota as Record<string, unknown>).usage_monthly_usd = safeFloat(matchedKey.usage_monthly);
          }
        }
      } else if (keysRes.status === 401) {
        // Management key tidak valid — catat tapi jangan set down
        console.warn("[OpenRouter] Management key unauthorized");
      }
    }

    const response_ms = Date.now() - start;
    let status: CheckResult["status"] = "up";

    // Alert jika credits hampir habis
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
      status_code: 200,
      quota,
      checked_at: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return {
      status: "down",
      response_ms: Date.now() - start,
      error_msg: err instanceof Error ? err.message : "Unknown error",
      checked_at: new Date().toISOString(),
    };
  }
}