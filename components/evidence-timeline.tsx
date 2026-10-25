import type { EvidenceType } from "@prisma/client";
import {
  EVIDENCE_DESCRIPTIONS,
  EVIDENCE_LABELS,
} from "@/lib/evidence";
import { formatDateTime } from "@/lib/format";

export interface TimelineEvent {
  type: EvidenceType | string;
  occurredAt: string;
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
    <ol className="timeline">
      {ordered.map((event, index) => {
        const type = event.type as EvidenceType;
        const label = EVIDENCE_LABELS[type] ?? event.type;
        const description = EVIDENCE_DESCRIPTIONS[type];
        return (
          <li className="timeline__item" key={`${event.occurredAt}-${index}`}>
            <span className="timeline__dot" aria-hidden="true" />
            <p className="timeline__heading">
              <span>{label}</span>
              <time className="timeline__date" dateTime={event.occurredAt}>
                {formatDateTime(event.occurredAt)}
              </time>
            </p>
            {description ? <p className="timeline__copy">{description}</p> : null}
            {showHashes && event.eventHash ? (
              <p className="hash mt-1">chain {event.eventHash.slice(0, 16)}…</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
