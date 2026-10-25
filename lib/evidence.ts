import type { EvidenceType, Prisma } from "@prisma/client";
import { canonicalJson } from "./canonical";
import { sha256Hex } from "./crypto";

export interface EvidenceEventLike {
  id?: string;
  experienceId?: string;
  sequence: number;
  type: EvidenceType;
  actorId: string | null;
  payload: Prisma.JsonValue | null;
  occurredAt: Date;
  previousHash: string | null;
  eventHash: string;
}

export interface EvidenceEventInput {
  experienceId: string;
  sequence: number;
  type: EvidenceType;
  actorId?: string | null;
  payload?: Record<string, unknown> | null;
  occurredAt: Date;
  previousHash: string | null;
}

export function evidenceEventHash(input: EvidenceEventInput): string {
  return sha256Hex(
    canonicalJson({
      schema: "proof-of-experience/evidence-event@1",
      experienceId: input.experienceId,
      sequence: input.sequence,
      type: input.type,
      actorId: input.actorId ?? null,
      payload: input.payload ?? null,
      occurredAt: input.occurredAt.toISOString(),
      previousHash: input.previousHash,
    }),
  );
}

export interface EvidenceChainResult {
  valid: boolean;
  head: string | null;
  error?: string;
}

export function verifyEvidenceChain(
  experienceId: string,
  events: EvidenceEventLike[],
): EvidenceChainResult {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  let previousHash: string | null = null;
  let expectedSequence = 1;

  for (const event of ordered) {
    if (event.sequence !== expectedSequence) {
      return {
        valid: false,
        head: previousHash,
        error: `Evidence sequence gap at position ${expectedSequence}`,
      };
    }
    if (event.previousHash !== previousHash) {
      return {
        valid: false,
        head: previousHash,
        error: `Evidence chain link mismatch at position ${event.sequence}`,
      };
    }
    const computed = evidenceEventHash({
      experienceId,
      sequence: event.sequence,
      type: event.type,
      actorId: event.actorId,
      payload: (event.payload ?? null) as Record<string, unknown> | null,
      occurredAt: event.occurredAt,
      previousHash: event.previousHash,
    });
    if (computed !== event.eventHash) {
      return {
        valid: false,
        head: previousHash,
        error: `Evidence event ${event.sequence} was altered`,
      };
    }
    previousHash = event.eventHash;
    expectedSequence += 1;
  }

  return { valid: true, head: previousHash };
}

export async function appendEvidenceEvent(
  tx: Prisma.TransactionClient,
  input: {
    experienceId: string;
    type: EvidenceType;
    actorId?: string | null;
    payload?: Record<string, unknown> | null;
    occurredAt?: Date;
  },
) {
  const previous = await tx.evidenceEvent.findFirst({
    where: { experienceId: input.experienceId },
    orderBy: { sequence: "desc" },
    select: { sequence: true, eventHash: true },
  });

  const occurredAt = input.occurredAt ?? new Date();
  const sequence = (previous?.sequence ?? 0) + 1;
  const previousHash = previous?.eventHash ?? null;
  const eventHash = evidenceEventHash({
    experienceId: input.experienceId,
    sequence,
    type: input.type,
    actorId: input.actorId ?? null,
    payload: input.payload ?? null,
    occurredAt,
    previousHash,
  });

  return tx.evidenceEvent.create({
    data: {
      experienceId: input.experienceId,
      sequence,
      type: input.type,
      actorId: input.actorId ?? null,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
      occurredAt,
      previousHash,
      eventHash,
    },
  });
}

export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  record_created: "Record created",
  media_uploaded: "Media hashed and added",
  location_confirmed: "Location confirmed by creator",
  device_attested: "Device context recorded",
  witness_invited: "Witness invited",
  witness_attested: "Witness attestation signed",
  published: "Record published",
  unpublished: "Record unpublished",
  flagged: "Record flagged for review",
  revoked: "Record revoked",
  restored: "Record restored",
};

export const EVIDENCE_DESCRIPTIONS: Record<EvidenceType, string> = {
  record_created: "The initial record structure was committed to the evidence ledger.",
  media_uploaded: "A file was hashed with SHA-256 and added to the record.",
  location_confirmed: "The creator confirmed the recorded place and time.",
  device_attested: "Capture-device context was recorded for this record.",
  witness_invited: "An independent witness was invited to review a specific claim.",
  witness_attested: "A witness signed a claim against the record hash in force at that moment.",
  published: "The creator opened the record for verification.",
  unpublished: "The creator removed the record from public verification.",
  flagged: "The registry placed this record under review.",
  revoked: "The record was revoked. Its prior evidence remains visible for inspection.",
  restored: "The registry restored the record after review.",
};
