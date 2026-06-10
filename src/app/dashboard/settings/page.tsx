"use client";
import { useEffect, useState } from "react";
import { Settings, Plus, Trash2, Bell, Copy, Check } from "lucide-react";
import type { NotificationChannel } from "@/types";

export default function SettingsPage() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [name, setName] = useState("");
  const [to, setTo] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  const cronUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/cron/check?secret=YOUR_CRON_SECRET`
    : "/api/cron/check?secret=YOUR_CRON_SECRET";

  async function fetchChannels() {
    const res = await fetch("/api/notifications");
    if (res.ok) setChannels(await res.json());
  }

  useEffect(() => { fetchChannels(); }, []);

  async function addChannel(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, to }),
    });
    setName(""); setTo("");
    setAdding(false);
    fetchChannels();
  }

  async function deleteChannel(id: string) {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchChannels();
  }

  function copyUrl() {
    navigator.clipboard.writeText(cronUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Settings
      </h1>

      {/* Cron setup */}
      <div className="card space-y-3">
        <h2 className="text-sm font-medium">Cron job setup (cron-job.org)</h2>
        <p className="text-xs text-zinc-500">
          Add this URL to <a href="https://cron-job.org" target="_blank" className="text-brand-400 hover:underline">cron-job.org</a> with your desired interval (minimum 10 seconds on free tier). Replace{" "}
          <code className="text-zinc-300 bg-zinc-800 px-1 rounded">YOUR_CRON_SECRET</code> with your{" "}
          <code className="text-zinc-300 bg-zinc-800 px-1 rounded">CRON_SECRET</code> env variable.
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
          <code className="text-xs text-green-400 flex-1 truncate">{cronUrl}</code>
          <button onClick={copyUrl} className="text-zinc-400 hover:text-zinc-100 shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-xs text-zinc-500 space-y-1">
          <p>• Free tier on cron-job.org: 5 minute minimum interval (use 60 seconds for best free results)</p>
          <p>• Paid tier: can go down to 10 seconds</p>
          <p>• Each check run will ping all enabled monitors in parallel</p>
        </div>
      </div>

      {/* Notification channels */}
      <div className="card space-y-4">
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Email notification channels
        </h2>

        {channels.length > 0 && (
          <div className="space-y-2">
            {channels.map((ch) => (
              <div key={ch.id} className="flex items-center justify-between py-2 px-3 bg-zinc-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{ch.name}</p>
                  <p className="text-xs text-zinc-500">{ch.config.to}</p>
                </div>
                <button onClick={() => deleteChannel(ch.id)} className="text-zinc-600 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addChannel} className="space-y-3 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500">Add a new email channel. Then link it to monitors when adding/editing them.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Channel name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ops team" required />
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="ops@acme.com" required />
            </div>
          </div>
          <button type="submit" disabled={adding} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Add channel
          </button>
        </form>

        <div className="border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-500 font-medium mb-1">SMTP configuration</p>
          <p className="text-xs text-zinc-600">
            Configure via environment variables: <code className="text-zinc-400">SMTP_HOST</code>,{" "}
            <code className="text-zinc-400">SMTP_PORT</code>,{" "}
            <code className="text-zinc-400">SMTP_USER</code>,{" "}
            <code className="text-zinc-400">SMTP_PASS</code>,{" "}
            <code className="text-zinc-400">SMTP_FROM</code>
          </p>
        </div>
      </div>
    </div>
  );
}
