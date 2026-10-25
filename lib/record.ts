import type { Prisma } from "@prisma/client";
import { canonicalJson } from "./canonical";
import { sha256Hex } from "./crypto";
import { verifyAttestationSignature } from "./keys";

export const experienceFullInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      avatarUrl: true,
      publicKey: true,
    },
  },
  claims: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
  media: {
    orderBy: [{ isCover: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  },
  participants: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
  },
  witnesses: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  attestations: {
    orderBy: [{ attestedAt: "asc" }, { id: "asc" }],
    include: {
      witness: {
        select: {
          id: true,
          email: true,
          normalizedEmail: true,
          invitedName: true,
        },
      },
    },
  },
  evidenceEvents: {
    orderBy: [{ sequence: "asc" }],
  },
} satisfies Prisma.ExperienceInclude;

export type FullExperience = Prisma.ExperienceGetPayload<{
  include: typeof experienceFullInclude;
}>;

export interface CanonicalRecordPayload {
  schema: "proof-of-experience/record@1";
  experience: {
    id: string;
    creatorId: string;
    slug: string;
    title: string;
    summary: string;
    category: string;
    locationName: string;
    hasCoordinates: boolean;
    startAt: string;
    endAt: string;
  };
  claims: Array<{
    id: string;
    position: number;
    text: string;
    evidence: string | null;
  }>;
  media: Array<{
    id: string;
    sha256: string;
    mimeType: string;
    size: number;
    capturedAt: string | null;
    isCover: boolean;
    gpsPresent: boolean;
    exif: Record<string, unknown> | null;
  }>;
  participants: Array<{
    id: string;
    position: number;
    name: string;
    role: string;
  }>;
  attestations: Array<{
    id: string;
    claimId: string;
    witnessId: string;
    witnessPublicKey: string;
    relationship: string;
    signedRecordHash: string;
    attestedAt: string;
    confirmationCommitment: string;
  }>;
  evidenceEvents: Array<{
    id: string;
    sequence: number;
    type: string;
    occurredAt: string;
    previousHash: string | null;
    eventHash: string;
  }>;
}

export function confirmationCommitment(
  confirmedName: string,
  witnessId: string,
): string {
  return sha256Hex(`proof-of-experience/witness-name@1\n${witnessId}\n${confirmedName}`);
}

function exifSummary(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function buildRecordPayload(experience: FullExperience): CanonicalRecordPayload {
  return {
    schema: "proof-of-experience/record@1",
    experience: {
      id: experience.id,
      creatorId: experience.creatorId,
      slug: experience.slug,
      title: experience.title,
      summary: experience.summary,
      category: experience.category,
      locationName: experience.locationName,
      hasCoordinates: Boolean(experience.latitudeEnc && experience.longitudeEnc),
      startAt: experience.startAt.toISOString(),
      endAt: experience.endAt.toISOString(),
    },
    claims: experience.claims.map((claim) => ({
      id: claim.id,
      position: claim.position,
      text: claim.text,
      evidence: claim.evidence ?? null,
    })),
    media: experience.media.map((asset) => ({
      id: asset.id,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      size: asset.size,
      capturedAt: asset.capturedAt?.toISOString() ?? null,
      isCover: asset.isCover,
      gpsPresent: asset.gpsPresent,
      exif: exifSummary(asset.exif),
    })),
    participants: experience.participants.map((participant) => ({
      id: participant.id,
      position: participant.position,
      name: participant.name,
      role: participant.role,
    })),
    attestations: experience.attestations.map((attestation) => ({
      id: attestation.id,
      claimId: attestation.claimId,
      witnessId: attestation.witnessId,
      witnessPublicKey: attestation.witnessPublicKey,
      relationship: attestation.relationship,
      signedRecordHash: attestation.signedRecordHash,
      attestedAt: attestation.attestedAt.toISOString(),
      confirmationCommitment: confirmationCommitment(
        attestation.confirmedName,
        attestation.witnessId,
      ),
    })),
    evidenceEvents: experience.evidenceEvents.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      type: event.type,
      occurredAt: event.occurredAt.toISOString(),
      previousHash: event.previousHash,
      eventHash: event.eventHash,
    })),
  };
}

export function computeRecordHash(experience: FullExperience): string {
  return sha256Hex(canonicalJson(buildRecordPayload(experience)));
}

/**
 * A complete, verifiable signature check for the current seal.
 * Integrity also verifies that the signer key is the application's trusted
 * server key, so a database adversary cannot replace both content and signer.
 */
export function verifyAttestationSignatureForRecord(attestation: {
  claimId: string;
  signedRecordHash: string;
  witnessId: string;
  attestedAt: Date;
  signature: string;
  witnessPublicKey: string;
}): boolean {
  return verifyAttestationSignature({
    claimId: attestation.claimId,
    recordHash: attestation.signedRecordHash,
    witnessId: attestation.witnessId,
    attestedAt: attestation.attestedAt,
    signature: attestation.signature,
    publicKeyBase64: attestation.witnessPublicKey,
  });
}
