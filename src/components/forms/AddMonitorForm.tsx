"use client";
import { useState, useEffect } from "react";
import { X, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import type { MonitorType, Vendor } from "@/types";

interface AddMonitorFormProps {
  defaultType: MonitorType;
  onSuccess: () => void;
  onClose: () => void;
}

const AI_VENDORS: { value: Vendor; label: string }[] = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
  { value: "groq", label: "Groq" },
  { value: "anthropic", label: "Anthropic" },
];

const OTHER_VENDORS: { value: Vendor; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "stripe", label: "Stripe" },
  { value: "twilio", label: "Twilio" },
  { value: "sendgrid", label: "SendGrid" },
  { value: "custom", label: "Custom" },
];

// Providers that require CA cert — auto-detect from hostname
const CA_REQUIRED_HOSTS = ["aivencloud.com", "render.com"];

function detectSslProvider(host: string): "aiven" | "render" | null {
  if (host.includes("aivencloud.com")) return "aiven";
  if (host.includes("render.com")) return "render";
  return null;
}

export function AddMonitorForm({ defaultType, onSuccess, onClose }: AddMonitorFormProps) {
  const [type, setType] = useState<MonitorType>(defaultType);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [vendor, setVendor] = useState<Vendor>("openrouter");
  const [apiLabel, setApiLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [intervalSec, setIntervalSec] = useState(60);
  const [alertOnSlowMs, setAlertOnSlowMs] = useState("");
  const [alertQuotaPct, setAlertQuotaPct] = useState(20);

  // DB fields
  const [dbHost, setDbHost] = useState("");
  const [dbPort, setDbPort] = useState("5432");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");
  const [dbSsl, setDbSsl] = useState(false);
  const [sslCa, setSslCa] = useState("");
  const [sslCert, setSslCert] = useState("");
  const [sslKey, setSslKey] = useState("");

  // Header quota fields
  const [quotaRemainingHeader, setQuotaRemainingHeader] = useState("x-ratelimit-remaining-requests");
  const [quotaLimitHeader, setQuotaLimitHeader] = useState("x-ratelimit-limit-requests");
  const [quotaTokensRemainingHeader, setQuotaTokensRemainingHeader] = useState("");
  const [quotaTokensLimitHeader, setQuotaTokensLimitHeader] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-enable SSL and show hint when host matches known providers
  const sslProvider = detectSslProvider(dbHost);
  const needsCa = dbSsl && CA_REQUIRED_HOSTS.some((h) => dbHost.includes(h));
  const caWarning = needsCa && !sslCa.trim();

  useEffect(() => {
    if (sslProvider && !dbSsl) setDbSsl(true);
  }, [sslProvider, dbSsl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credentials: Record<string, string> = {};
      if (apiKey) credentials.api_key = apiKey;
      if (dbPassword) credentials.db_password = dbPassword;
      if (dbUser) credentials.db_user = dbUser;
      if (sslCa) credentials.ssl_ca = sslCa;
      if (sslCert) credentials.ssl_cert = sslCert;
      if (sslKey) credentials.ssl_key = sslKey;

      const quotaHeaders =
        type === "api_header_quota"
          ? {
              remaining: quotaRemainingHeader || undefined,
              limit: quotaLimitHeader || undefined,
              remaining_tokens: quotaTokensRemainingHeader || undefined,
              limit_tokens: quotaTokensLimitHeader || undefined,
            }
          : undefined;

      const body = {
        name,
        type,
        url: url || undefined,
        vendor:
          type === "api_ai"
            ? vendor
            : type === "api_generic" || type === "api_header_quota"
            ? vendor || "custom"
            : undefined,
        api_label: apiLabel || undefined,
        interval_sec: intervalSec,
        alert_on_slow_ms: alertOnSlowMs ? parseInt(alertOnSlowMs) : undefined,
        alert_quota_pct: alertQuotaPct,
        quota_headers: quotaHeaders,
        db_host: dbHost || undefined,
        db_port: dbPort ? parseInt(dbPort) : undefined,
        db_name: dbName || undefined,
        db_ssl: dbSsl,
        credentials,
      };

      const res = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create monitor");
      }

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="font-semibold text-sm">Add Monitor</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type selector */}
          <div>
            <label className="label">Monitor type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["server", "database", "api_ai", "api_generic", "api_header_quota"] as MonitorType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3 py-2 rounded-lg text-xs border transition-colors text-left ${
                    type === t
                      ? "border-brand-600 bg-brand-600/20 text-brand-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {t === "server" && "🖥 Server / HTTP"}
                  {t === "database" && "🗄 Database"}
                  {t === "api_ai" && "✨ AI API (quota)"}
                  {t === "api_generic" && "🔌 Generic API"}
                  {t === "api_header_quota" && "📊 Header Quota API"}
                </button>
              ))}
            </div>
          </div>

          {/* Common name */}
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="prod-api-01"
              required
            />
          </div>

          {/* Server / Generic API URL */}
          {(type === "server" || type === "api_generic" || type === "api_header_quota") && (
            <div>
              <label className="label">URL *</label>
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/health"
                required
              />
            </div>
          )}

          {/* AI vendor */}
          {type === "api_ai" && (
            <>
              <div>
                <label className="label">Vendor *</label>
                <select className="input" value={vendor} onChange={(e) => setVendor(e.target.value as Vendor)}>
                  {AI_VENDORS.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Account label</label>
                <input
                  className="input"
                  value={apiLabel}
                  onChange={(e) => setApiLabel(e.target.value)}
                  placeholder="team@acme.com"
                />
              </div>
            </>
          )}

          {/* Generic vendor */}
          {type === "api_generic" && (
            <div>
              <label className="label">Vendor / provider</label>
              <select className="input" value={vendor} onChange={(e) => setVendor(e.target.value as Vendor)}>
                {OTHER_VENDORS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key */}
          {(type === "api_ai" || type === "api_generic" || type === "api_header_quota") && (
            <div>
              <label className="label">API Key</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Stored encrypted with AES-256-GCM</p>
            </div>
          )}

          {/* Header quota config */}
          {type === "api_header_quota" && (
            <div className="space-y-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-xs font-medium text-zinc-400">Response header mapping</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Remaining requests header</label>
                  <input className="input text-xs" value={quotaRemainingHeader} onChange={(e) => setQuotaRemainingHeader(e.target.value)} placeholder="x-ratelimit-remaining-requests" />
                </div>
                <div>
                  <label className="label">Limit requests header</label>
                  <input className="input text-xs" value={quotaLimitHeader} onChange={(e) => setQuotaLimitHeader(e.target.value)} placeholder="x-ratelimit-limit-requests" />
                </div>
                <div>
                  <label className="label">Remaining tokens header</label>
                  <input className="input text-xs" value={quotaTokensRemainingHeader} onChange={(e) => setQuotaTokensRemainingHeader(e.target.value)} placeholder="x-ratelimit-remaining-tokens" />
                </div>
                <div>
                  <label className="label">Limit tokens header</label>
                  <input className="input text-xs" value={quotaTokensLimitHeader} onChange={(e) => setQuotaTokensLimitHeader(e.target.value)} placeholder="x-ratelimit-limit-tokens" />
                </div>
              </div>
            </div>
          )}

          {/* ── DATABASE FIELDS ─────────────────────────────── */}
          {type === "database" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="label">Host *</label>
                  <input
                    className="input"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    placeholder="db.example.com"
                    required
                  />
                </div>
                <div>
                  <label className="label">Port</label>
                  <input
                    className="input"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    placeholder="5432"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Database name *</label>
                  <input
                    className="input"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    placeholder="mydb"
                    required
                  />
                </div>
                <div>
                  <label className="label">User</label>
                  <input
                    className="input"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    placeholder="postgres"
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <p className="text-xs text-zinc-500 mt-1">Stored encrypted with AES-256-GCM</p>
              </div>

              {/* SSL toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={dbSsl}
                  onChange={(e) => setDbSsl(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="ssl" className="text-xs text-zinc-400">
                  Enable SSL
                  {sslProvider === "aiven" && (
                    <span className="ml-2 text-amber-400 font-medium">— Aiven terdeteksi, SSL wajib</span>
                  )}
                </label>
              </div>

              {/* SSL config section */}
              {dbSsl && (
                <div className="space-y-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">

                  {/* Provider-specific guide */}
                  {sslProvider === "aiven" && (
                    <div className="flex gap-2 p-2 bg-amber-900/20 border border-amber-800/40 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-300 space-y-1">
                        <p className="font-medium">Aiven memerlukan CA Certificate</p>
                        <p className="text-amber-400/80">
                          Download dari Aiven Console → service → Overview → <span className="font-mono">CA Certificate</span> → Download.
                          Lalu buka file <span className="font-mono">ca.pem</span> dengan text editor dan paste isinya di bawah.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CA Certificate — paling penting, taruh paling atas */}
                  <div>
                    <label className="label">
                      CA Certificate
                      {needsCa && <span className="text-amber-400 ml-1">*</span>}
                    </label>
                    <textarea
                      className={`input font-mono text-xs h-28 resize-y ${caWarning ? "border-amber-600" : ""}`}
                      value={sslCa}
                      onChange={(e) => setSslCa(e.target.value)}
                      placeholder={"-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----"}
                    />
                    {caWarning && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        CA Certificate diperlukan untuk provider ini
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Paste isi file <span className="font-mono">.pem</span> langsung — termasuk baris <span className="font-mono">BEGIN/END CERTIFICATE</span>
                    </p>
                  </div>

                  {/* Client cert & key — collapsed by default, only for mutual TLS */}
                  <details className="group">
                    <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">
                      Client Certificate & Key (opsional, hanya untuk mutual TLS)
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="label">Client Certificate</label>
                        <textarea
                          className="input font-mono text-xs h-20 resize-y"
                          value={sslCert}
                          onChange={(e) => setSslCert(e.target.value)}
                          placeholder={"-----BEGIN CERTIFICATE-----\nMIIE..."}
                        />
                      </div>
                      <div>
                        <label className="label">Client Key</label>
                        <textarea
                          className="input font-mono text-xs h-20 resize-y"
                          value={sslKey}
                          onChange={(e) => setSslKey(e.target.value)}
                          placeholder={"-----BEGIN PRIVATE KEY-----\nMIIE..."}
                        />
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Alert settings */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="label">Check interval (seconds)</label>
              <input
                className="input"
                type="number"
                min={10}
                value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Slow threshold (ms, optional)</label>
              <input
                className="input"
                type="number"
                value={alertOnSlowMs}
                onChange={(e) => setAlertOnSlowMs(e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            {(type === "api_ai" || type === "api_header_quota") && (
              <div>
                <label className="label">Quota alert threshold (%)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={100}
                  value={alertQuotaPct}
                  onChange={(e) => setAlertQuotaPct(parseInt(e.target.value))}
                />
                <p className="text-xs text-zinc-500 mt-1">Alert when quota drops below this %</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}