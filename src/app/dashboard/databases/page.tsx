"use client";
import { useEffect, useState } from "react";
import { Plus, Database, Trash2, RefreshCw, HardDrive, Users, Info } from "lucide-react";
import type { Monitor } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddMonitorForm } from "@/components/forms/AddMonitorForm";
import { formatDistanceToNow } from "date-fns";

function ProgressBar({ value, max, warn = 70, danger = 90 }: { value: number; max: number; warn?: number; danger?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct >= danger ? "bg-red-500" : pct >= warn ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function DatabasesPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchMonitors() {
    const res = await fetch("/api/monitors");
    if (res.ok) {
      const all: Monitor[] = await res.json();
      setMonitors(all.filter((m) => m.type === "database"));
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
          <Database className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-semibold">Databases</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMonitors} className="btn">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add database
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-zinc-500 text-sm">Loading...</div>
      ) : monitors.length === 0 ? (
        <div className="card text-center py-12">
          <Database className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No database monitors yet.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" /> Add first database
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {monitors.map((m) => {
            const metrics = m.latest_db_metrics;
            return (
              <div key={m.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.db_host}:{m.db_port ?? 5432}/{m.db_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.latest_status} />
                    <button onClick={() => deleteMonitor(m.id)} className="text-zinc-600 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {metrics && (
                  <div className="space-y-2 border-t border-zinc-800 pt-3">
                    {metrics.size_mb !== undefined && (
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-400 w-20">Disk size</span>
                        <span className="text-xs text-zinc-300 font-mono">
                          {metrics.size_mb >= 1024
                            ? `${(metrics.size_mb / 1024).toFixed(1)} GB`
                            : `${metrics.size_mb} MB`}
                        </span>
                      </div>
                    )}

                    {metrics.connections !== undefined && metrics.max_connections !== undefined && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="text-xs text-zinc-400 w-20">Connections</span>
                          <span className="text-xs text-zinc-300 font-mono">
                            {metrics.connections} / {metrics.max_connections}
                          </span>
                        </div>
                        <ProgressBar value={metrics.connections} max={metrics.max_connections} />
                      </div>
                    )}

                    {metrics.version && (
                      <div className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-400 w-20">Version</span>
                        <span className="text-xs text-zinc-300 font-mono">{metrics.version}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
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
          defaultType="database"
          onSuccess={() => { setShowForm(false); fetchMonitors(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
