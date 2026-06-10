import type { Monitor, CheckResult, QuotaSnapshot } from "@/types";
import { getCredential } from "@/lib/db/credentials";
import { checkOpenRouter } from "@/lib/integrations/openrouter";
import { checkGroq } from "@/lib/integrations/groq";
import { checkOpenAI } from "@/lib/integrations/openai";

export async function checkApi(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  switch (monitor.type) {
    case "api_ai":
      return checkAiApi(monitor);
    case "api_header_quota":
      return checkHeaderQuotaApi(monitor);
    case "api_generic":
    default:
      return checkGenericApi(monitor);
  }
}

// ── Generic API: ping URL, measure latency, check status code ──

async function checkGenericApi(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  if (!monitor.url) {
    return { status: "unknown", error_msg: "No URL configured", checked_at: new Date().toISOString() };
  }

  const apiKey = await getCredential(monitor.id, "api_key");
  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      "User-Agent": "MonitoringDashboard/1.0",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(monitor.url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    const response_ms = Date.now() - start;
    const status_code = res.status;
    let status: CheckResult["status"] = "up";
    if (status_code >= 500) status = "down";
    else if (status_code >= 400) status = "degraded";
    else if (monitor.alert_on_slow_ms && response_ms > monitor.alert_on_slow_ms) status = "degraded";

    return { status, response_ms, status_code, checked_at: new Date().toISOString() };
  } catch (err: unknown) {
    const response_ms = Date.now() - start;
    const error_msg = err instanceof Error
      ? err.name === "AbortError" ? "Timeout after 15s" : err.message
      : "Unknown error";
    return { status: "down", response_ms, error_msg, checked_at: new Date().toISOString() };
  }
}

// ── Header-based quota API ──────────────────────────────────

async function checkHeaderQuotaApi(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  if (!monitor.url) {
    return { status: "unknown", error_msg: "No URL configured", checked_at: new Date().toISOString() };
  }

  const apiKey = await getCredential(monitor.id, "api_key");
  const headerConfig = monitor.quota_headers ?? {};
  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      "User-Agent": "MonitoringDashboard/1.0",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(monitor.url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    const response_ms = Date.now() - start;
    const status_code = res.status;

    // Parse quota from response headers
    const quota: QuotaSnapshot = {};
    if (headerConfig.remaining) {
      const v = res.headers.get(headerConfig.remaining);
      if (v) quota.rpm_remaining = parseFloat(v);
    }
    if (headerConfig.limit) {
      const v = res.headers.get(headerConfig.limit);
      if (v) quota.rpm_limit = parseFloat(v);
    }
    if (headerConfig.remaining_tokens) {
      const v = res.headers.get(headerConfig.remaining_tokens);
      if (v) quota.tokens_remaining = parseFloat(v);
    }
    if (headerConfig.limit_tokens) {
      const v = res.headers.get(headerConfig.limit_tokens);
      if (v) quota.tokens_limit = parseFloat(v);
    }

    let status: CheckResult["status"] = status_code < 400 ? "up" : status_code >= 500 ? "down" : "degraded";

    // Check quota threshold
    if (quota.rpm_remaining !== undefined && quota.rpm_limit) {
      const pct = (quota.rpm_remaining / quota.rpm_limit) * 100;
      if (pct < monitor.alert_quota_pct) status = "degraded";
    }

    return { status, response_ms, status_code, quota, checked_at: new Date().toISOString() };
  } catch (err: unknown) {
    const response_ms = Date.now() - start;
    const error_msg = err instanceof Error
      ? err.name === "AbortError" ? "Timeout after 15s" : err.message
      : "Unknown error";
    return { status: "down", response_ms, error_msg, checked_at: new Date().toISOString() };
  }
}

// ── AI API vendor routing ───────────────────────────────────

async function checkAiApi(
  monitor: Monitor
): Promise<Omit<CheckResult, "id" | "monitor_id">> {
  const vendor = monitor.vendor;

  switch (vendor) {
    case "openrouter":
      return checkOpenRouter(monitor);
    case "groq":
      return checkGroq(monitor);
    case "openai":
      return checkOpenAI(monitor);
    default:
      // Fallback: generic ping
      return checkGenericApi(monitor);
  }
}
