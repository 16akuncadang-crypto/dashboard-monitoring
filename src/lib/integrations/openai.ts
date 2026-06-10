import type { Monitor, CheckResult, QuotaSnapshot } from "@/types";
import { getCredential } from "@/lib/db/credentials";

export async function checkOpenAI(
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
    // Ping models endpoint for liveness, read rate-limit headers
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "MonitoringDashboard/1.0",
      },
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

    const quota: QuotaSnapshot = {};

    // OpenAI exposes some rate-limit info in headers on chat completions
    // For models endpoint we get basic availability only
    const rpmRemaining = res.headers.get("x-ratelimit-remaining-requests");
    const rpmLimit = res.headers.get("x-ratelimit-limit-requests");
    const tpmRemaining = res.headers.get("x-ratelimit-remaining-tokens");
    const tpmLimit = res.headers.get("x-ratelimit-limit-tokens");

    if (rpmRemaining) quota.rpm_remaining = parseFloat(rpmRemaining);
    if (rpmLimit) quota.rpm_limit = parseFloat(rpmLimit);
    if (tpmRemaining) quota.tokens_remaining = parseFloat(tpmRemaining);
    if (tpmLimit) quota.tokens_limit = parseFloat(tpmLimit);

    const status: CheckResult["status"] = res.ok ? "up" : res.status >= 500 ? "down" : "degraded";

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
