"use client";
import { useEffect, useState, useCallback } from "react";
import type { Monitor } from "@/types";

export function useMonitors(type?: string, intervalMs = 10_000) {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/monitors");
      if (!res.ok) throw new Error("Failed to fetch monitors");
      const all: Monitor[] = await res.json();
      setMonitors(type ? all.filter((m) => m.type === type || m.type.startsWith(type)) : all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, intervalMs);
    return () => clearInterval(interval);
  }, [fetch_, intervalMs]);

  return { monitors, loading, error, refetch: fetch_ };
}
