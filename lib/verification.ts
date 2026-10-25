import type { EvidenceType, ExperienceStatus } from "@prisma/client";
import { getRecordSigningPublicKey, verifyRecordHash } from "./keys";
import {
  computeRecordHash,
  type FullExperience,
  verifyAttestationSignatureForRecord,
} from "./record";
import { verifyEvidenceChain } from "./evidence";
import { calculateTrust, type TrustResult } from "./trust";

export type IntegrityState = "valid" | "altered" | "unsealed";

export interface IntegrityReport {
  state: IntegrityState;
  altered: boolean;
  recordHash: string | null;
  computedHash: string;
  signedAt: string | null;
  sealedVersion: number;
  publicKey: string | null;
  signature: string | null;
  checks: {
    recordHashMatches: boolean;
    signatureValid: boolean;
    trustedSigner: boolean;
    evidenceChainValid: boolean;
    attestationSignaturesValid: boolean;
  };
}

export function analyzeIntegrity(experience: FullExperience): IntegrityReport {
  const computedHash = computeRecordHash(experience);
  const recordHash = experience.recordHash;
  const hasSeal = Boolean(recordHash && experience.signature && experience.publicKey);

  if (!hasSeal) {
    return {
      state: "unsealed",
      altered: false,
      recordHash,
      computedHash,
      signedAt: experience.signedAt?.toISOString() ?? null,
      sealedVersion: experience.sealedVersion,
      publicKey: experience.publicKey,
      signature: experience.signature,
      checks: {
        recordHashMatches: false,
        signatureValid: false,
        trustedSigner: false,
        evidenceChainValid: verifyEvidenceChain(
          experience.id,
          experience.evidenceEvents,
        ).valid,
        attestationSignaturesValid: experience.attestations.every(
          verifyAttestationSignatureForRecord,
        ),
      },
    };
  }

  const recordHashMatches = computedHash === recordHash;
  const signatureValid = verifyRecordHash(
    recordHash as string,
    experience.signature as string,
    experience.publicKey as string,
  );

  let trustedSigner = false;
  try {
    trustedSigner =
      experience.publicKey === getRecordSigningPublicKey();
  } catch {
    trustedSigner = false;
  }

  const evidenceChainValid = verifyEvidenceChain(
    experience.id,
    experience.evidenceEvents,
  ).valid;
  const attestationSignaturesValid = experience.attestations.every(
    verifyAttestationSignatureForRecord,
  );

  const altered =
    !recordHashMatches ||
    !signatureValid ||
    !trustedSigner ||
    !evidenceChainValid ||
    !attestationSignaturesValid;

  return {
    state: altered ? "altered" : "valid",
    altered,
    recordHash,
    computedHash,
    signedAt: experience.signedAt?.toISOString() ?? null,
    sealedVersion: experience.sealedVersion,
    publicKey: experience.publicKey,
    signature: experience.signature,
    checks: {
      recordHashMatches,
      signatureValid,
      trustedSigner,
      evidenceChainValid,
      attestationSignaturesValid,
    },
  };
}

export function independentValidWitnesses(
  experience: FullExperience,
): Array<{ normalizedEmail: string; witnessId: string }> {
  const creatorEmail = experience.creator.email.toLowerCase();
  const valid = experience.attestations.filter(verifyAttestationSignatureForRecord);
  const seen = new Set<string>();
  const result: Array<{ normalizedEmail: string; witnessId: string }> = [];
  for (const attestation of valid) {
    const email = attestation.witness.normalizedEmail.toLowerCase();
    if (!email || email === creatorEmail || seen.has(email)) continue;
    seen.add(email);
    result.push({ normalizedEmail: email, witnessId: attestation.witnessId });
  }
  return result;
}

export function calculateExperienceTrust(experience: FullExperience): TrustResult {
  const signed = Boolean(
    experience.recordHash && experience.signature && experience.publicKey,
  );
  return calculateTrust({
    signed,
    locationConfirmed: Boolean(experience.locationConfirmedAt),
    deviceAttested: Boolean(experience.deviceAttestedAt),
    independentWitnesses: independentValidWitnesses(experience).length,
  });
}

const PUBLIC_STATUSES: ExperienceStatus[] = ["published", "flagged", "revoked"];

export function isPubliclyVisible(experience: FullExperience): boolean {
  return (
    experience.visibility !== "private" &&
    Boolean(experience.publishedAt) &&
    PUBLIC_STATUSES.includes(experience.status)
  );
}

export interface VerificationDocument {
  schema: "proof-of-experience/verification@1";
  generatedAt: string;
  record: {
    slug: string;
    title: string;
    summary: string;
    category: string;
    status: ExperienceStatus;
    visibility: string;
    location: string;
    startAt: string;
    endAt: string;
    publishedAt: string | null;
    createdAt: string;
    isDemo: boolean;
    creator: {
      name: string;
      handle: string;
      avatarUrl: string | null;
    };
  };
  trust: TrustResult & {
    witnessCount: number;
  };
  integrity: IntegrityReport & {
    note: string;
  };
  claims: Array<{
    id: string;
    position: number;
    text: string;
    evidence: string | null;
    witnessCount: number;
  }>;
  participants: Array<{ name: string; role: string }>;
  media: Array<{
    sha256: string;
    mimeType: string;
    size: number;
    capturedAt: string | null;
    gpsPresent: boolean;
    isCover: boolean;
    publicUrl: string;
  }>;
  evidenceEvents: Array<{
    sequence: number;
    type: EvidenceType;
    occurredAt: string;
    previousHash: string | null;
    eventHash: string;
  }>;
  attestations: Array<{
    label: string;
    relationship: string;
    claimId: string;
    attestedAt: string;
    signedRecordHash: string;
    witnessPublicKey: string;
    signature: string;
    signatureValid: boolean;
  }>;
  privacy: {
    note: string;
    exactCoordinatesIncluded: false;
    witnessEmailsIncluded: false;
    witnessNamesIncluded: false;
  };
}

export function buildVerificationDocument(
  experience: FullExperience,
  now = new Date(),
): VerificationDocument {
  const integrity = analyzeIntegrity(experience);
  const trust = calculateExperienceTrust(experience);
  const witnessCount = independentValidWitnesses(experience).length;
  const validAttestations = experience.attestations.filter(
    verifyAttestationSignatureForRecord,
  );

  const claimWitnessCounts = new Map<string, Set<string>>();
  for (const attestation of validAttestations) {
    const email = attestation.witness.normalizedEmail.toLowerCase();
    if (
      !email ||
      email === experience.creator.email.toLowerCase()
    ) {
      continue;
    }
    const set = claimWitnessCounts.get(attestation.claimId) ?? new Set<string>();
    set.add(email);
    claimWitnessCounts.set(attestation.claimId, set);
  }

  return {
    schema: "proof-of-experience/verification@1",
    generatedAt: now.toISOString(),
    record: {
      slug: experience.slug,
      title: experience.title,
      summary: experience.summary,
      category: experience.category,
      status: experience.status,
      visibility: experience.visibility,
      location: experience.locationName,
      startAt: experience.startAt.toISOString(),
      endAt: experience.endAt.toISOString(),
      publishedAt: experience.publishedAt?.toISOString() ?? null,
      createdAt: experience.createdAt.toISOString(),
      isDemo: experience.isDemo,
      creator: {
        name: experience.creator.name,
        handle: experience.creator.handle,
        avatarUrl: experience.creator.avatarUrl,
      },
    },
    trust: {
      ...trust,
      witnessCount,
    },
    integrity: {
      ...integrity,
      note: "A valid seal establishes record integrity and signer custody. It does not establish that the account is true, nor is it a legal signature.",
    },
    claims: experience.claims.map((claim) => ({
      id: claim.id,
      position: claim.position,
      text: claim.text,
      evidence: claim.evidence,
      witnessCount: claimWitnessCounts.get(claim.id)?.size ?? 0,
    })),
    participants: experience.participants.map((participant) => ({
      name: participant.name,
      role: participant.role,
    })),
    media: experience.media.map((asset) => ({
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      size: asset.size,
      capturedAt: asset.capturedAt?.toISOString() ?? null,
      gpsPresent: asset.gpsPresent,
      isCover: asset.isCover,
      publicUrl: `/api/media/${asset.id}`,
    })),
    evidenceEvents: experience.evidenceEvents.map((event) => ({
      sequence: event.sequence,
      type: event.type,
      occurredAt: event.occurredAt.toISOString(),
      previousHash: event.previousHash,
      eventHash: event.eventHash,
    })),
    attestations: validAttestations.map((attestation, index) => ({
      label: `Witness ${String(index + 1).padStart(2, "0")}`,
      relationship: attestation.relationship,
      claimId: attestation.claimId,
      attestedAt: attestation.attestedAt.toISOString(),
      signedRecordHash: attestation.signedRecordHash,
      witnessPublicKey: attestation.witnessPublicKey,
      signature: attestation.signature,
      signatureValid: true,
    })),
    privacy: {
      note: "This verification document excludes witness names, witness email addresses, participant email addresses, exact coordinates, and all private event payloads. Review the evidence, not just the badge.",
      exactCoordinatesIncluded: false,
      witnessEmailsIncluded: false,
      witnessNamesIncluded: false,
    },
  };
}
