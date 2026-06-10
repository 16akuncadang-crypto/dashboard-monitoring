"use client";
import { useEffect, useState } from "react";
import { Plus, Server, Trash2, RefreshCw } from "lucide-react";
import type { Monitor } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddMonitorForm } from "@/components/forms/AddMonitorForm";
import { formatDistanceToNow } from "date-fns";

export default function ServersPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchMonitors() {
    const res = await fetch("/api/monitors");
    if (res.ok) {
      const all: Monitor[] = await res.json();
      setMonitors(all.filter((m) => m.type === "server"));
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
          <Server className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-semibold">Servers</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchMonitors} className="btn">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add server
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-zinc-500 text-sm">Loading...</div>
      ) : monitors.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No server monitors yet.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary mt-4">
            <Plus className="w-4 h-4" /> Add first server
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">URL</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Response</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Last check</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs truncate max-w-xs">{m.url}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.latest_status} /></td>
                  <td className="px-4 py-3 text-zinc-400">
                    {m.latest_response_ms != null ? `${m.latest_response_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {m.latest_checked_at
                      ? formatDistanceToNow(new Date(m.latest_checked_at), { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMonitor(m.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AddMonitorForm
          defaultType="server"
          onSuccess={() => { setShowForm(false); fetchMonitors(); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
