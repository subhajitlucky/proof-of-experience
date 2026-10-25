import { Prisma } from "@prisma/client";
import { ApiError } from "../api";
import {
  createOpaqueToken,
  decryptString,
  encryptString,
  hashOpaqueToken,
  normalizeEmail,
  normalizeName,
} from "../crypto";
import { prisma } from "../db";
import { appendEvidenceEvent } from "../evidence";
import { generateEd25519KeyPair, signAttestation } from "../keys";
import {
  assertIntegrityNotAltered,
  assertOwner,
  findFullExperience,
  requireFullExperience,
  sealExperience,
  witnessProgressionStatus,
} from "./records";
import { analyzeIntegrity, isPubliclyVisible } from "../verification";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_WITNESSES_PER_RECORD = 20;

function publicAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function inviteWitness(
  experienceId: string,
  userId: string,
  input: { claimId: string; name: string; email: string },
): Promise<{
  witness: {
    id: string;
    name: string;
    email: string;
    claimId: string;
    expiresAt: string;
  };
  attestationUrl: string;
}> {
  const rawToken = createOpaqueToken(32);
  const tokenHash = hashOpaqueToken(rawToken);
  const tokenExpiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const witnessKeys = generateEd25519KeyPair();
  const normalizedEmail = normalizeEmail(input.email);

  const result = await prisma.$transaction(async (tx) => {
    const current = await requireFullExperience(tx, experienceId);
    assertOwner(current, userId);

    if (current.status === "flagged" || current.status === "revoked") {
      throw new ApiError(
        409,
        "RECORD_LOCKED",
        "This record cannot receive new witnesses while flagged or revoked.",
      );
    }
    assertIntegrityNotAltered(current);

    if (current.witnesses.length >= MAX_WITNESSES_PER_RECORD) {
      throw new ApiError(
        422,
        "TOO_MANY_WITNESSES",
        `A record can invite at most ${MAX_WITNESSES_PER_RECORD} witnesses.`,
      );
    }
    if (normalizedEmail === normalizeEmail(current.creator.email)) {
      throw new ApiError(
        422,
        "CREATOR_CANNOT_WITNESS",
        "The creator cannot be an independent witness.",
      );
    }
    if (
      current.witnesses.some(
        (witness) => witness.normalizedEmail === normalizedEmail,
      )
    ) {
      throw new ApiError(
        409,
        "WITNESS_ALREADY_INVITED",
        "This person has already been invited to this record.",
      );
    }

    const claim = current.claims.find((entry) => entry.id === input.claimId);
    if (!claim) {
      throw new ApiError(
        422,
        "UNKNOWN_CLAIM",
        "Choose a claim that belongs to this record.",
      );
    }

    const witness = await tx.witness.create({
      data: {
        experienceId,
        claimId: claim.id,
        invitedName: input.name,
        email: input.email,
        normalizedEmail,
        tokenHash,
        tokenExpiresAt,
        publicKey: witnessKeys.publicKey,
        encryptedPrivateKey: encryptString(witnessKeys.privateKey),
      },
      select: {
        id: true,
        invitedName: true,
        email: true,
        claimId: true,
        tokenExpiresAt: true,
      },
    });

    await appendEvidenceEvent(tx, {
      experienceId,
      type: "witness_invited",
      actorId: userId,
      payload: { claimId: claim.id, witnessId: witness.id },
    });

    if (current.status === "draft") {
      await tx.experience.update({
        where: { id: experienceId },
        data: { status: "evidence_pending" },
      });
    }

    await sealExperience(tx, experienceId);

    return witness;
  });

  const attestationUrl = `${publicAppUrl()}/attest/${rawToken}`;
  if (process.env.NODE_ENV === "development") {
    console.info(
      `[proof-of-experience] Witness invitation for ${input.email}: ${attestationUrl}`,
    );
  }

  return {
    witness: {
      id: result.id,
      name: result.invitedName,
      email: result.email,
      claimId: result.claimId,
      expiresAt: result.tokenExpiresAt.toISOString(),
    },
    attestationUrl,
  };
}

export type InvitationView =
  | { state: "not_found" }
  | {
      state: "expired";
      recordTitle: string;
      claimText: string;
    }
  | {
      state: "used";
      recordTitle: string;
      claimText: string;
      attestedAt: string;
      recordSlug: string | null;
    }
  | {
      state: "pending";
      invitedName: string;
      expiresAt: string;
      claim: { id: string; text: string; evidence: string | null };
      record: {
        title: string;
        summary: string;
        category: string;
        locationName: string;
        startAt: string;
        endAt: string;
        creatorName: string;
        creatorHandle: string;
        isDemo: boolean;
        integrityAltered: boolean;
        recordHash: string | null;
      };
    };

export async function getInvitation(rawToken: string): Promise<InvitationView> {
  const witness = await prisma.witness.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: {
      claim: true,
      attestation: true,
      experience: {
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          category: true,
          locationName: true,
          startAt: true,
          endAt: true,
          isDemo: true,
          creator: { select: { name: true, handle: true } },
        },
      },
    },
  });

  if (!witness) return { state: "not_found" };
  if (witness.usedAt || witness.attestation) {
    const isPublic = await prisma.experience.findUnique({
      where: { id: witness.experienceId },
      select: { slug: true, publishedAt: true, visibility: true, status: true },
    });
    const recordSlug =
      isPublic &&
      isPublic.publishedAt &&
      isPublic.visibility !== "private" &&
      ["published", "flagged", "revoked"].includes(isPublic.status)
        ? isPublic.slug
        : null;
    return {
      state: "used",
      recordTitle: witness.experience.title,
      claimText: witness.claim.text,
      attestedAt:
        witness.attestation?.attestedAt.toISOString() ??
        witness.usedAt?.toISOString() ??
        new Date().toISOString(),
      recordSlug,
    };
  }
  if (witness.tokenExpiresAt <= new Date()) {
    return {
      state: "expired",
      recordTitle: witness.experience.title,
      claimText: witness.claim.text,
    };
  }

  const full = await findFullExperience(prisma, witness.experienceId);
  const integrityAltered = full
    ? analyzeIntegrity(full).altered
    : true;

  return {
    state: "pending",
    invitedName: witness.invitedName,
    expiresAt: witness.tokenExpiresAt.toISOString(),
    claim: {
      id: witness.claim.id,
      text: witness.claim.text,
      evidence: witness.claim.evidence,
    },
    record: {
      title: witness.experience.title,
      summary: witness.experience.summary,
      category: witness.experience.category,
      locationName: witness.experience.locationName,
      startAt: witness.experience.startAt.toISOString(),
      endAt: witness.experience.endAt.toISOString(),
      creatorName: witness.experience.creator.name,
      creatorHandle: witness.experience.creator.handle,
      isDemo: witness.experience.isDemo,
      integrityAltered,
      recordHash: full?.recordHash ?? null,
    },
  };
}

export async function submitAttestation(
  rawToken: string,
  input: {
    name: string;
    relationship: string;
    confirmName: true;
    confirmRelationship: true;
  },
): Promise<{
  state: "attested";
  attestedAt: string;
  claimText: string;
  recordTitle: string;
  verificationUrl: string | null;
  trustLevel: string;
}> {
  const tokenHash = hashOpaqueToken(rawToken);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const witness = await tx.witness.findUnique({
          where: { tokenHash },
          include: {
            claim: true,
            attestation: true,
            experience: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        });

        if (!witness) {
          throw new ApiError(
            404,
            "ATTESTATION_NOT_FOUND",
            "This attestation link is not valid.",
          );
        }
        if (witness.usedAt || witness.attestation) {
          throw new ApiError(
            410,
            "ATTESTATION_USED",
            "This attestation link has already been used.",
          );
        }
        if (witness.tokenExpiresAt <= new Date()) {
          throw new ApiError(
            410,
            "ATTESTATION_EXPIRED",
            "This attestation link has expired. Ask the creator for a new invitation.",
          );
        }
        if (normalizeName(input.name) !== normalizeName(witness.invitedName)) {
          throw new ApiError(
            422,
            "NAME_MISMATCH",
            "The confirmed name does not match the invited witness name.",
          );
        }

        const experience = await requireFullExperience(tx, witness.experienceId);
        if (experience.status === "flagged" || experience.status === "revoked") {
          throw new ApiError(
            409,
            "RECORD_LOCKED",
            "This record cannot receive new attestations while flagged or revoked.",
          );
        }
        assertIntegrityNotAltered(experience);
        if (!experience.recordHash) {
          throw new ApiError(
            409,
            "RECORD_UNSEALED",
            "This record has not been sealed yet. Ask the creator to reissue the invitation.",
          );
        }

        const attestedAt = new Date();
        const signature = signAttestation(
          {
            claimId: witness.claimId,
            recordHash: experience.recordHash,
            witnessId: witness.id,
            attestedAt,
          },
          decryptString(witness.encryptedPrivateKey),
        );

        await tx.attestation.create({
          data: {
            experienceId: witness.experienceId,
            claimId: witness.claimId,
            witnessId: witness.id,
            confirmedName: input.name,
            relationship: input.relationship,
            witnessPublicKey: witness.publicKey,
            signedRecordHash: experience.recordHash,
            signature,
            attestedAt,
          },
        });
        await tx.witness.update({
          where: { id: witness.id },
          data: { usedAt: attestedAt },
        });
        await appendEvidenceEvent(tx, {
          experienceId: witness.experienceId,
          type: "witness_attested",
          actorId: null,
          payload: {
            claimId: witness.claimId,
            witnessId: witness.id,
            recordHash: experience.recordHash,
          },
        });

        const after = await requireFullExperience(tx, witness.experienceId);
        if (after.status !== "published") {
          const nextStatus = witnessProgressionStatus(after, true);
          await tx.experience.update({
            where: { id: after.id },
            data: { status: nextStatus },
          });
        }

        const seal = await sealExperience(tx, experience.id);
        const finalRecord = await requireFullExperience(tx, experience.id);
        const publicApp = publicAppUrl();
        const verificationUrl = isPubliclyVisible(finalRecord)
          ? `${publicApp}/verify/${finalRecord.slug}`
          : null;

        return {
          attestedAt: attestedAt.toISOString(),
          claimText: witness.claim.text,
          recordTitle: witness.experience.title,
          verificationUrl,
          trustLevel: seal.trustLevel,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return { state: "attested", ...result };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        410,
        "ATTESTATION_USED",
        "This attestation link has already been used.",
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      throw new ApiError(
        409,
        "ATTESTATION_CONFLICT",
        "Another change was being recorded at the same time. Please try again.",
      );
    }
    throw error;
  }
}
