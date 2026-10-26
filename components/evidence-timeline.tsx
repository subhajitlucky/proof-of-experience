import type { EvidenceType } from "@prisma/client";
import {
  EVIDENCE_DESCRIPTIONS,
  EVIDENCE_LABELS,
} from "@/lib/evidence";
import { formatDateTime } from "@/lib/format";

export interface TimelineEvent {
  type: EvidenceType | string;
  occurredAt: string;
  sequence?: number;
  eventHash?: string | null;
  previousHash?: string | null;
}

export function EvidenceTimeline({
  events,
  showHashes = false,
  emptyText = "No evidence events recorded yet.",
}: {
  events: TimelineEvent[];
  showHashes?: boolean;
  emptyText?: string;
}) {
  const ordered = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  if (ordered.length === 0) {
    return <p className="text-[13px] text-muted">{emptyText}</p>;
  }

  return (
    <ol className="evidence-ledger">
      {ordered.map((event, index) => {
        const type = event.type as EvidenceType;
        const label = EVIDENCE_LABELS[type] ?? event.type;
        const description = EVIDENCE_DESCRIPTIONS[type];
        return (
          <li className="evidence-ledger__row" key={`${event.occurredAt}-${index}`}>
            <span className="evidence-ledger__sequence">
              {String(event.sequence ?? ordered.length - index).padStart(2, "0")}
            </span>
            <div className="evidence-ledger__content">
              <div className="evidence-ledger__heading">
                <span>{label}</span>
                <time dateTime={event.occurredAt}>
                  {formatDateTime(event.occurredAt)}
                </time>
              </div>
              {description ? (
                <p className="evidence-ledger__copy">{description}</p>
              ) : null}
              {showHashes && event.eventHash ? (
                <p className="evidence-ledger__hash">
                  <span>Event hash</span>
                  {event.eventHash}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
