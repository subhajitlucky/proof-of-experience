import { decryptNumber } from "./crypto";
import { calculateExperienceTrust, analyzeIntegrity } from "./verification";
import type { FullExperience } from "./record";

function witnessState(witness: FullExperience["witnesses"][number]): string {
  if (witness.usedAt) return "attested";
  if (witness.tokenExpiresAt <= new Date()) return "expired";
  return "pending";
}

export function serializeOwnerExperience(experience: FullExperience) {
  const integrity = analyzeIntegrity(experience);
  const trust = calculateExperienceTrust(experience);
  let exactCoordinates: { latitude: number; longitude: number } | null = null;
  if (experience.latitudeEnc && experience.longitudeEnc) {
    try {
      exactCoordinates = {
        latitude: decryptNumber(experience.latitudeEnc),
        longitude: decryptNumber(experience.longitudeEnc),
      };
    } catch {
      exactCoordinates = null;
    }
  }

  return {
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    summary: experience.summary,
    category: experience.category,
    locationName: experience.locationName,
    exactCoordinates,
    showExactLocation: experience.showExactLocation,
    startAt: experience.startAt.toISOString(),
    endAt: experience.endAt.toISOString(),
    visibility: experience.visibility,
    status: experience.status,
    trustLevel: experience.trustLevel,
    isDemo: experience.isDemo,
    createdAt: experience.createdAt.toISOString(),
    updatedAt: experience.updatedAt.toISOString(),
    publishedAt: experience.publishedAt?.toISOString() ?? null,
    flaggedAt: experience.flaggedAt?.toISOString() ?? null,
    flagReason: experience.flagReason,
    revokedAt: experience.revokedAt?.toISOString() ?? null,
    locationConfirmedAt: experience.locationConfirmedAt?.toISOString() ?? null,
    deviceAttestedAt: experience.deviceAttestedAt?.toISOString() ?? null,
    record: {
      hash: experience.recordHash,
      signature: experience.signature,
      publicKey: experience.publicKey,
      signedAt: experience.signedAt?.toISOString() ?? null,
      sealedVersion: experience.sealedVersion,
    },
    integrity,
    trust,
    claims: experience.claims.map((claim) => ({
      id: claim.id,
      position: claim.position,
      text: claim.text,
      evidence: claim.evidence,
    })),
    media: experience.media.map((asset) => ({
      id: asset.id,
      url: `/api/media/${asset.id}`,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      sha256: asset.sha256,
      capturedAt: asset.capturedAt?.toISOString() ?? null,
      gpsPresent: asset.gpsPresent,
      exif: asset.exif,
      isCover: asset.isCover,
      createdAt: asset.createdAt.toISOString(),
    })),
    participants: experience.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: participant.role,
      email: participant.email,
    })),
    witnesses: experience.witnesses.map((witness) => ({
      id: witness.id,
      name: witness.invitedName,
      email: witness.email,
      claimId: witness.claimId,
      state: witnessState(witness),
      invitedAt: witness.createdAt.toISOString(),
      expiresAt: witness.tokenExpiresAt.toISOString(),
      usedAt: witness.usedAt?.toISOString() ?? null,
    })),
    attestations: experience.attestations.map((attestation) => ({
      id: attestation.id,
      claimId: attestation.claimId,
      witnessId: attestation.witnessId,
      confirmedName: attestation.confirmedName,
      relationship: attestation.relationship,
      signedRecordHash: attestation.signedRecordHash,
      witnessPublicKey: attestation.witnessPublicKey,
      signature: attestation.signature,
      attestedAt: attestation.attestedAt.toISOString(),
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

export function serializeExperienceSummary(experience: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  visibility: string;
  trustLevel: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  _count: {
    claims: number;
    media: number;
    witnesses: number;
    attestations: number;
  };
}) {
  return {
    id: experience.id,
    slug: experience.slug,
    title: experience.title,
    summary: experience.summary,
    category: experience.category,
    status: experience.status,
    visibility: experience.visibility,
    trustLevel: experience.trustLevel,
    isDemo: experience.isDemo,
    createdAt: experience.createdAt.toISOString(),
    updatedAt: experience.updatedAt.toISOString(),
    publishedAt: experience.publishedAt?.toISOString() ?? null,
    counts: experience._count,
  };
}
