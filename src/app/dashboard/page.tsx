"use client";
import { useEffect, useState, useCallback } from "react";
import { Server, Database, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import type { Monitor, DashboardSummary, Incident } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { QuotaBar } from "@/components/ui/QuotaBar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface StatusData {
  summary: DashboardSummary;
  monitors: Monitor[];
  incidents: Incident[];
  timestamp: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const servers = data?.monitors.filter((m) => m.type === "server") ?? [];
  const databases = data?.monitors.filter((m) => m.type === "database") ?? [];
  const apis = data?.monitors.filter((m) => m.type.startsWith("api")) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          {lastRefresh && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            </p>
          )}
        </div>
        <button onClick={fetchStatus} className="btn" disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Server className="w-4 h-4 text-blue-400" />}
            label="Servers"
            monitors={servers}
          />
          <SummaryCard
            icon={<Database className="w-4 h-4 text-purple-400" />}
            label="Databases"
            monitors={databases}
          />
          <SummaryCard
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            label="APIs"
            monitors={apis}
          />
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-zinc-400">Active incidents</span>
            </div>
            <p className="text-2xl font-semibold text-red-400">
              {data.summary.active_incidents}
            </p>
          </div>
        </div>
      )}

      {/* Active Incidents */}
      {data && data.incidents.length > 0 && (
        <div className="card border-red-900/50">
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Active Incidents
          </h2>
          <div className="space-y-2">
            {data.incidents.map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{inc.monitor_name}</p>
                  <p className="text-xs text-zinc-500">{inc.cause}</p>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(inc.started_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All monitors table */}
      {data && data.monitors.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-medium mb-4">All Monitors</h2>
          <div className="space-y-1">
            {data.monitors.map((m) => (
              <MonitorRow key={m.id} monitor={m} />
            ))}
          </div>
        </div>
      )}

      {data && data.monitors.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-zinc-500 text-sm">No monitors yet.</p>
          <div className="flex justify-center gap-3 mt-4">
            <Link href="/dashboard/servers" className="btn btn-primary">Add server</Link>
            <Link href="/dashboard/databases" className="btn">Add database</Link>
            <Link href="/dashboard/apis" className="btn">Add API</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon, label, monitors,
}: {
  icon: React.ReactNode;
  label: string;
  monitors: Monitor[];
}) {
  const up = monitors.filter((m) => m.latest_status === "up").length;
  const down = monitors.filter((m) => m.latest_status === "down").length;
  const total = monitors.length;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <p className="text-2xl font-semibold">
        <span className={down > 0 ? "text-red-400" : "text-green-400"}>{up}</span>
        <span className="text-zinc-600 text-lg"> / {total}</span>
      </p>
      {down > 0 && <p className="text-xs text-red-400 mt-1">{down} down</p>}
    </div>
  );
}

function MonitorRow({ monitor }: { monitor: Monitor }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <StatusBadge status={monitor.latest_status} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{monitor.name}</p>
        <p className="text-xs text-zinc-500 truncate">
          {monitor.url ?? monitor.db_host ?? monitor.vendor ?? monitor.type}
        </p>
      </div>
      <div className="text-right shrink-0">
        {monitor.latest_response_ms !== undefined && monitor.latest_response_ms !== null && (
          <p className="text-xs text-zinc-400">{monitor.latest_response_ms}ms</p>
        )}
        {monitor.latest_checked_at && (
          <p className="text-xs text-zinc-600">
            {formatDistanceToNow(new Date(monitor.latest_checked_at), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
}
