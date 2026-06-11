"use client";
import { useEffect, useState } from "react";
import { Plus, Zap, Trash2, RefreshCw, TrendingUp, Clock, DollarSign, Activity } from "lucide-react";
import type { Monitor } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuotaBar } from "@/components/ui/QuotaBar";
import { AddMonitorForm } from "@/components/forms/AddMonitorForm";
import { formatDistanceToNow } from "date-fns";

const VENDOR_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  groq: "Groq",
  anthropic: "Anthropic",
  stripe: "Stripe",
  twilio: "Twilio",
  sendgrid: "SendGrid",
  github: "GitHub",
  custom: "Custom",
};

const VENDOR_COLORS: Record<string, string> = {
  openrouter: "text-violet-400 bg-violet-900/30 border-violet-800/50",
  openai: "text-emerald-400 bg-emerald-900/30 border-emerald-800/50",
  groq: "text-orange-400 bg-orange-900/30 border-orange-800/50",
  anthropic: "text-amber-400 bg-amber-900/30 border-amber-800/50",
  custom: "text-zinc-400 bg-zinc-800 border-zinc-700",
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 bg-zinc-800/60 rounded-lg border border-zinc-700/50 min-w-0">
      <span className="text-xs text-zinc-500 whitespace-nowrap">{label}</span>
      <span className="text-sm font-semibold text-zinc-200 font-mono mt-0.5">{value}</span>
    </div>
  );
}

function OpenRouterCard({ m, onDelete }: { m: Monitor; onDelete: () => void }) {
  const quota = m.latest_quota as Record<string, number | undefined> | undefined;

  const creditsRemaining = quota?.credits_usd;
  const creditsLimit = quota?.credits_limit_usd;
  const usageDaily = (quota as Record<string, unknown>)?.usage_daily_usd as number | undefined;
  const usageMonthly = (quota as Record<string, unknown>)?.usage_monthly_usd as number | undefined;
  const rpmLimit = quota?.rpm_limit;

  const credPct =
    creditsRemaining !== undefined && creditsLimit && creditsLimit > 0
      ? Math.round((creditsRemaining / creditsLimit) * 100)
      : null;

  const creditColor =
    credPct === null ? "text-zinc-300"
    : credPct < 10 ? "text-red-400"
    : credPct < 25 ? "text-amber-400"
    : "text-green-400";

  return (
    <div className="card space-y-0 p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{m.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${VENDOR_COLORS.openrouter}`}>
              OpenRouter
            </span>
            {m.api_label && (
              <span className="text-xs text-zinc-500 truncate">{m.api_label}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StatusBadge status={m.latest_status} />
          <button onClick={onDelete} className="text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Credits highlight */}
      {creditsRemaining !== undefined && (
        <div className="mx-4 mb-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <DollarSign className="w-3.5 h-3.5" />
              Credits remaining
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold font-mono ${creditColor}`}>
                ${creditsRemaining.toFixed(2)}
              </span>
              {creditsLimit !== undefined && (
                <span className="text-xs text-zinc-600">/ ${creditsLimit.toFixed(2)}</span>
              )}
            </div>
          </div>
          {credPct !== null && (
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  credPct < 10 ? "bg-red-500"
                  : credPct < 25 ? "bg-amber-500"
                  : "bg-green-500"
                }`}
                style={{ width: `${credPct}%` }}
              />
            </div>
          )}
          {credPct !== null && (
            <p className="text-xs text-zinc-500 mt-1">{credPct}% remaining</p>
          )}
        </div>
      )}

      {/* Usage stats row */}
      {(usageDaily !== undefined || usageMonthly !== undefined || rpmLimit !== undefined) && (
        <div className="flex gap-2 px-4 mb-3 flex-wrap">
          {usageDaily !== undefined && (
            <StatPill label="Used today" value={`$${usageDaily.toFixed(4)}`} />
          )}
          {usageMonthly !== undefined && (
            <StatPill label="Used this month" value={`$${usageMonthly.toFixed(4)}`} />
          )}
          {rpmLimit !== undefined && (
            <StatPill label="Rate limit" value={`${rpmLimit} RPM`} />
          )}
        </div>
      )}

      {/* No quota data yet */}
      {!quota && (
        <div className="px-4 pb-3">
          <p className="text-xs text-zinc-600 italic">No data yet — waiting for first check</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Activity className="w-3 h-3" />
          {m.latest_response_ms != null ? `${m.latest_response_ms}ms` : "—"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Clock className="w-3 h-3" />
          {m.latest_checked_at
            ? formatDistanceToNow(new Date(m.latest_checked_at), { addSuffix: true })
            : "Never checked"}
        </div>
      </div>
    </div>
  );
}

function GenericAiCard({ m, onDelete }: { m: Monitor; onDelete: () => void }) {
  const quota = m.latest_quota;
  const isAi = m.type === "api_ai" || m.type === "api_header_quota";
  const vendorColor = VENDOR_COLORS[m.vendor ?? ""] ?? VENDOR_COLORS.custom;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{m.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {m.vendor && (
              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${vendorColor}`}>
                {VENDOR_LABELS[m.vendor] ?? m.vendor}
              </span>
            )}
            {m.api_label && (
              <span className="text-xs text-zinc-500 truncate">{m.api_label}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StatusBadge status={m.latest_status} />
          <button onClick={onDelete} className="text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quota bars */}
      {isAi && quota && (
        <div className="space-y-2 border-t border-zinc-800 pt-3">
          <QuotaBar label="Req / min" remaining={quota.rpm_remaining} limit={quota.rpm_limit} />
          <QuotaBar label="Req / day" remaining={quota.rpd_remaining} limit={quota.rpd_limit} />
          <QuotaBar label="Tokens" remaining={quota.tokens_remaining} limit={quota.tokens_limit} format="tokens" />
          {quota.credits_usd !== undefined && (
            <QuotaBar label="Credits" remaining={quota.credits_usd} limit={quota.credits_limit_usd} format="usd" />
          )}
        </div>
      )}

      {!isAi && m.url && (
        <p className="text-xs text-zinc-500 font-mono truncate border-t border-zinc-800 pt-3">{m.url}</p>
      )}

      {isAi && !quota && (
        <p className="text-xs text-zinc-600 italic border-t border-zinc-800 pt-3">
          No data yet — waiting for first check
        </p>
      )}

      <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Activity className="w-3 h-3" />
          {m.latest_response_ms != null ? `${m.latest_response_ms}ms` : "—"}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Clock className="w-3 h-3" />
          {m.latest_checked_at
            ? formatDistanceToNow(new Date(m.latest_checked_at), { addSuffix: true })
            : "Never checked"}
        </div>
      </div>
    </div>
  );
}

export default function ApisPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchMonitors() {
    const res = await fetch("/api/monitors");
    if (res.ok) {
      const all: Monitor[] = await res.json();
      setMonitors(all.filter((m) => m.type.startsWith("api")));
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 10_000);
    return () => clearInterval(interval);
  }, []);

  async function deleteMonitor(id: string) {
    if (!confirm("Delete this monitor?")) return;
    await fetch(`/api/monitors/${id}`, { method: "DELETE" });
    fetchMonitors();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-semibold">APIs</h1>
          {monitors.length > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              {monitors.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMonitors} className="btn">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add API
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-zinc-500 text-sm">Loading...</div>
      ) : monitors.length === 0 ? (
        <div className="card text-center py-12">
          <Zap className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No API monitors yet.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" /> Add first API
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {monitors.map((m) =>
            m.vendor === "openrouter" ? (
              <OpenRouterCard key={m.id} m={m} onDelete={() => deleteMonitor(m.id)} />
            ) : (
              <GenericAiCard key={m.id} m={m} onDelete={() => deleteMonitor(m.id)} />
            )
          )}
        </div>
      )}

      {showForm && (
        <AddMonitorForm
          defaultType="api_ai"
          onSuccess={() => { setShowForm(false); fetchMonitors(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}