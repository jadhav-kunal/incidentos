import type { IncidentStatus } from "../types/incident.types";

const styles: Record<IncidentStatus, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const labels: Record<IncidentStatus, string> = {
  pending: "● Pending",
  processing: "⟳ Analyzing...",
  completed: "✓ Resolved",
  failed: "✗ Failed",
};

export default function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}