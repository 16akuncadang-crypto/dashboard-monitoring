import type { MonitorStatus } from "@/types";

const dot = "w-1.5 h-1.5 rounded-full";

export function StatusBadge({ status }: { status?: MonitorStatus }) {
  switch (status) {
    case "up":
      return (
        <span className="badge-up">
          <span className={`${dot} bg-green-400`} />
          Up
        </span>
      );
    case "down":
      return (
        <span className="badge-down">
          <span className={`${dot} bg-red-400`} />
          Down
        </span>
      );
    case "degraded":
      return (
        <span className="badge-degraded">
          <span className={`${dot} bg-amber-400`} />
          Degraded
        </span>
      );
    default:
      return (
        <span className="badge-unknown">
          <span className={`${dot} bg-zinc-500`} />
          Unknown
        </span>
      );
  }
}
