"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Incident } from "@/types";
import { formatDistanceToNow, format } from "date-fns";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchIncidents() {
    const res = await fetch("/api/incidents");
    if (res.ok) setIncidents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchIncidents();
    const i = setInterval(fetchIncidents, 15_000);
    return () => clearInterval(i);
  }, []);

  const active = incidents.filter((i) => !i.resolved_at);
  const resolved = incidents.filter((i) => i.resolved_at);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        Incidents
      </h1>

      {loading ? (
        <div className="card text-center py-12 text-zinc-500 text-sm">Loading...</div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Active ({active.length})</h2>
              {active.map((inc) => (
                <IncidentRow key={inc.id} incident={inc} />
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400">Resolved ({resolved.length})</h2>
              {resolved.map((inc) => (
                <IncidentRow key={inc.id} incident={inc} />
              ))}
            </div>
          )}

          {incidents.length === 0 && (
            <div className="card text-center py-12">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No incidents recorded.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const isActive = !incident.resolved_at;
  const duration = incident.resolved_at
    ? Math.round(
        (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 60000
      )
    : null;

  return (
    <div className={`card border-l-2 ${isActive ? "border-l-red-500" : "border-l-green-600"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-sm">{incident.monitor_name}</p>
          {incident.cause && (
            <p className="text-xs text-zinc-500 mt-0.5">{incident.cause}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isActive
            ? "bg-red-900/50 text-red-400 border border-red-800/50"
            : "bg-green-900/50 text-green-400 border border-green-800/50"
        }`}>
          {isActive ? "Active" : "Resolved"}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
        <span>Started {formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })}</span>
        <span className="text-zinc-700">{format(new Date(incident.started_at), "MMM d, HH:mm")}</span>
        {duration !== null && (
          <span>Duration: {duration}m</span>
        )}
      </div>
    </div>
  );
}
