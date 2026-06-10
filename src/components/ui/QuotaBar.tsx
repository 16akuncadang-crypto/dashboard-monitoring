import { clsx } from "clsx";

interface QuotaBarProps {
  label: string;
  remaining?: number;
  limit?: number;
  format?: "number" | "usd" | "tokens";
}

export function QuotaBar({ label, remaining, limit, format = "number" }: QuotaBarProps) {
  if (remaining === undefined) return null;

  const pct = limit && limit > 0 ? Math.round((remaining / limit) * 100) : null;

  const color =
    pct === null ? "bg-zinc-600"
    : pct < 10 ? "bg-red-500"
    : pct < 25 ? "bg-amber-500"
    : "bg-green-500";

  function fmt(n: number) {
    if (format === "usd") return `$${n.toFixed(2)}`;
    if (format === "tokens") {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
      return n.toString();
    }
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return n.toString();
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">
          {fmt(remaining)}{limit ? ` / ${fmt(limit)}` : ""}
          {pct !== null && <span className="text-zinc-500 ml-1">({pct}%)</span>}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all", color)}
          style={{ width: `${pct ?? 100}%` }}
        />
      </div>
    </div>
  );
}
