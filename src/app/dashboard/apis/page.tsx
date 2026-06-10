"use client";
import { useEffect, useState } from "react";
import { Plus, Zap, Trash2, RefreshCw } from "lucide-react";
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
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMonitors} className="btn"><RefreshCw className="w-3.5 h-3.5" /></button>
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
          {monitors.map((m) => {
            const quota = m.latest_quota;
            const isAi = m.type === "api_ai" || m.type === "api_header_quota";

            return (
              <div key={m.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.vendor && (
                        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                          {VENDOR_LABELS[m.vendor] ?? m.vendor}
                        </span>
                      )}
                      {m.api_label && (
                        <span className="text-xs text-zinc-500">{m.api_label}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.latest_status} />
                    <button onClick={() => deleteMonitor(m.id)} className="text-zinc-600 hover:text-red-400">
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

                {/* Generic API - just latency */}
                {!isAi && m.url && (
                  <p className="text-xs text-zinc-500 font-mono truncate">{m.url}</p>
                )}

                <div className="flex justify-between border-t border-zinc-800 pt-2">
                  <span className="text-xs text-zinc-600">
                    {m.latest_response_ms != null ? `${m.latest_response_ms}ms` : "—"}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {m.latest_checked_at
                      ? formatDistanceToNow(new Date(m.latest_checked_at), { addSuffix: true })
                      : "Never checked"}
                  </span>
                </div>
              </div>
            );
          })}
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
