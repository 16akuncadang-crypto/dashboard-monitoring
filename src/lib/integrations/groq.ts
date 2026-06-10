import type { Monitor, CheckResult, QuotaSnapshot } from "@/types";
import { getCredential } from "@/lib/db/credentials";

export async function checkGroq(
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
    // Groq exposes quota only via response headers on actual API calls
    // We send a minimal 1-token request to a cheap/fast model
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "MonitoringDashboard/1.0",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 1,
      }),
    });

    const response_ms = Date.now() - start;

    if (res.status === 401) {
      return {
        status: "down",
        response_ms,
        status_code: 401,
        error_msg: "Invalid API key",
        checked_at: new Date().toISOString(),
      };
    }

    // Read rate limit headers
    const quota: QuotaSnapshot = {};

    const h = (name: string) => {
      const v = res.headers.get(name);
      return v ? parseFloat(v) : undefined;
    };

    quota.rpm_remaining = h("x-ratelimit-remaining-requests");
    quota.rpm_limit     = h("x-ratelimit-limit-requests");
    quota.tokens_remaining = h("x-ratelimit-remaining-tokens");
    quota.tokens_limit  = h("x-ratelimit-limit-tokens");

    let status: CheckResult["status"] = res.ok || res.status === 429 ? "up" : "degraded";

    if (res.status === 429) {
      status = "degraded";
    }

    // Check quota thresholds
    if (
      quota.rpm_remaining !== undefined &&
      quota.rpm_limit !== undefined &&
      quota.rpm_limit > 0
    ) {
      const pct = (quota.rpm_remaining / quota.rpm_limit) * 100;
      if (pct < monitor.alert_quota_pct) status = "degraded";
    }

    if (
      quota.tokens_remaining !== undefined &&
      quota.tokens_limit !== undefined &&
      quota.tokens_limit > 0
    ) {
      const pct = (quota.tokens_remaining / quota.tokens_limit) * 100;
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
