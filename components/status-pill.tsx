import { statusLabel, statusTone } from "@/lib/format";

export function StatusPill({
  status,
  altered = false,
  className = "",
}: {
  status: string;
  altered?: boolean;
  className?: string;
}) {
  const tone = statusTone(status, altered);
  const toneClass =
    tone === "good"
      ? "status-pill--good"
      : tone === "warning"
        ? "status-pill--warning"
        : tone === "danger"
          ? "status-pill--danger"
          : "status-pill--muted";

  return (
    <span className={`status-pill ${toneClass} ${className}`.trim()}>
      {altered ? "Altered" : statusLabel(status)}
    </span>
  );
}
