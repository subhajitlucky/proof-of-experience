import type { Prisma, PrismaClient } from "@prisma/client";
import { ApiError } from "../api";
import {
  computeRecordHash,
  experienceFullInclude,
  type FullExperience,
} from "../record";
import { calculateTrust } from "../trust";
import { signRecordHash, getRecordSigningPublicKey } from "../keys";
import {
  analyzeIntegrity,
  independentValidWitnesses,
} from "../verification";

export type ExperienceDb = Prisma.TransactionClient | PrismaClient;

export const fullExperienceQuery = {
  include: experienceFullInclude,
} as const;

export async function findFullExperience(
  db: ExperienceDb,
  id: string,
): Promise<FullExperience | null> {
  return db.experience.findUnique({
    where: { id },
    ...fullExperienceQuery,
  }) as Promise<FullExperience | null>;
}

export async function requireFullExperience(
  db: ExperienceDb,
  id: string,
): Promise<FullExperience> {
  const experience = await findFullExperience(db, id);
  if (!experience) {
    throw new ApiError(404, "NOT_FOUND", "This experience could not be found.");
  }
  return experience;
}

/**
 * Recompute the canonical hash of the current record and replace its seal.
 * This is called only after deliberate, server-authorised evidence events.
 * It must never be used to "repair" a record with a mismatched existing seal.
 */
export async function sealExperience(
  tx: Prisma.TransactionClient,
  experienceId: string,
): Promise<{
  recordHash: string;
  signature: string;
  publicKey: string;
  signedAt: Date;
  sealedVersion: number;
  trustLevel: FullExperience["trustLevel"];
}> {
  const experience = await requireFullExperience(tx, experienceId);
  const recordHash = computeRecordHash(experience);
  const signature = signRecordHash(recordHash);
  const publicKey = getRecordSigningPublicKey();
  const signedAt = new Date();
  const trust = calculateTrust({
    signed: true,
    locationConfirmed: Boolean(experience.locationConfirmedAt),
    deviceAttested: Boolean(experience.deviceAttestedAt),
    independentWitnesses: independentValidWitnesses(experience).length,
  });

  const updated = await tx.experience.update({
    where: { id: experienceId },
    data: {
      recordHash,
      signature,
      publicKey,
      signedAt,
      sealedVersion: { increment: 1 },
      trustLevel: trust.level,
    },
    select: {
      recordHash: true,
      signature: true,
      publicKey: true,
      signedAt: true,
      sealedVersion: true,
      trustLevel: true,
    },
  });

  return {
    recordHash: updated.recordHash as string,
    signature: updated.signature as string,
    publicKey: updated.publicKey as string,
    signedAt: updated.signedAt as Date,
    sealedVersion: updated.sealedVersion,
    trustLevel: updated.trustLevel,
  };
}

export function assertIntegrityNotAltered(experience: FullExperience): void {
  const integrity = analyzeIntegrity(experience);
  if (integrity.altered) {
    throw new ApiError(
      409,
      "RECORD_ALTERED",
      "This record's signed content no longer matches its seal. It cannot be changed or re-sealed until an administrator reviews it.",
    );
  }
}

export function assertOwner(
  experience: { creatorId: string },
  userId: string,
): void {
  if (experience.creatorId !== userId) {
    throw new ApiError(
      403,
      "FORBIDDEN",
      "You do not have permission to change this record.",
    );
  }
}

export function witnessProgressionStatus(
  experience: FullExperience,
  sealed: boolean,
): "draft" | "evidence_pending" | "witness_verified" {
  if (!sealed) return "draft";
  return independentValidWitnesses(experience).length >= 2
    ? "witness_verified"
    : "evidence_pending";
}
