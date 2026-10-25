import { Prisma, type Category, type Visibility } from "@prisma/client";
import { prisma } from "../db";
import { ApiError } from "../api";
import { encryptNumber } from "../crypto";
import type { PreparedMedia } from "../media";
import { MAX_IMAGES_PER_RECORD } from "../media-constants";
import { appendEvidenceEvent } from "../evidence";
import {
  assertIntegrityNotAltered,
  assertOwner,
  requireFullExperience,
  sealExperience,
  witnessProgressionStatus,
} from "./records";
import { ensureUniqueSlug } from "../slug";
import { getStorage, deleteStoredFiles } from "../storage";
import type {
  ClaimInput,
  ExperienceCreateInput,
  ExperienceUpdateInput,
  ParticipantInput,
} from "../validation";
import type { FullExperience } from "../record";

export interface CreateExperienceServiceInput
  extends Omit<ExperienceCreateInput, "latitude" | "longitude"> {
  latitude?: number;
  longitude?: number;
  images: PreparedMedia[];
  coverIndex?: number;
}

function claimCreate(claims: ClaimInput[]): Prisma.ClaimCreateWithoutExperienceInput[] {
  return claims.map((claim, index) => ({
    position: index + 1,
    text: claim.text,
    evidence: claim.evidence ?? null,
  }));
}

function participantCreate(
  participants: ParticipantInput[],
): Prisma.ParticipantCreateWithoutExperienceInput[] {
  return participants.map((participant, index) => ({
    position: index + 1,
    name: participant.name,
    role: participant.role,
    email: participant.email ?? null,
  }));
}

async function storePreparedImages(images: PreparedMedia[]): Promise<string[]> {
  const storage = getStorage();
  const stored: string[] = [];
  try {
    for (const image of images) {
      await storage.put(
        image.data.storageKey,
        image.buffer,
        image.data.mimeType,
      );
      stored.push(image.data.storageKey);
    }
    return stored;
  } catch (error) {
    await deleteStoredFiles(stored);
    throw error;
  }
}

export async function createExperience(
  creatorId: string,
  input: CreateExperienceServiceInput,
): Promise<{ id: string; slug: string }> {
  if (input.images.length > MAX_IMAGES_PER_RECORD) {
    throw new ApiError(
      422,
      "TOO_MANY_IMAGES",
      `A record can include at most ${MAX_IMAGES_PER_RECORD} images.`,
    );
  }

  let coverIndex = input.coverIndex ?? 0;
  if (!Number.isInteger(coverIndex) || coverIndex < 0) coverIndex = 0;
  if (input.images.length === 0) coverIndex = -1;
  if (coverIndex >= input.images.length) {
    throw new ApiError(
      422,
      "INVALID_COVER",
      "Choose a cover image from the uploaded files.",
    );
  }

  const images = input.images.map((image, index) => ({
    ...image,
    data: {
      ...image.data,
      isCover: index === coverIndex,
    },
  }));

  const cameraEvidence = images.find(
    (image) => image.data.exif?.cameraMake || image.data.exif?.cameraModel,
  );
  const now = new Date();
  const locationConfirmedAt = input.confirmLocation ? now : null;
  const deviceAttestedAt = cameraEvidence ? now : null;
  const storedKeys = await storePreparedImages(images);

  try {
    const slug = await ensureUniqueSlug(
      async (candidate) =>
        prisma.experience.findUnique({
          where: { slug: candidate },
          select: { id: true },
        }),
      input.title,
    );

    const experience = await prisma.$transaction(async (tx) => {
      const created = await tx.experience.create({
        data: {
          creatorId,
          slug,
          title: input.title,
          summary: input.summary,
          category: input.category,
          locationName: input.locationName,
          latitudeEnc:
            input.latitude !== undefined ? encryptNumber(input.latitude) : null,
          longitudeEnc:
            input.longitude !== undefined ? encryptNumber(input.longitude) : null,
          showExactLocation: input.showExactLocation,
          startAt: input.startAt,
          endAt: input.endAt,
          visibility: input.visibility,
          status: "draft",
          locationConfirmedAt,
          deviceAttestedAt,
          claims: { create: claimCreate(input.claims) },
          participants: { create: participantCreate(input.participants) },
          media: {
            create: images.map((image) => ({
              ...image.data,
              exif: image.data.exif ?? Prisma.JsonNull,
            })),
          },
        },
        include: {
          media: { orderBy: [{ isCover: "desc" }, { createdAt: "asc" }] },
        },
      });

      await appendEvidenceEvent(tx, {
        experienceId: created.id,
        type: "record_created",
        actorId: creatorId,
        payload: { schemaVersion: 1, mediaCount: created.media.length },
      });

      for (const media of created.media) {
        await appendEvidenceEvent(tx, {
          experienceId: created.id,
          type: "media_uploaded",
          actorId: creatorId,
          payload: {
            mediaId: media.id,
            sha256: media.sha256,
            mimeType: media.mimeType,
          },
        });
      }

      if (locationConfirmedAt) {
        await appendEvidenceEvent(tx, {
          experienceId: created.id,
          type: "location_confirmed",
          actorId: creatorId,
          payload: { source: "creator_confirmation" },
        });
      }

      if (deviceAttestedAt) {
        await appendEvidenceEvent(tx, {
          experienceId: created.id,
          type: "device_attested",
          actorId: creatorId,
          payload: {
            source: "exif",
            cameraMake: cameraEvidence?.data.exif?.cameraMake ?? null,
            cameraModel: cameraEvidence?.data.exif?.cameraModel ?? null,
          },
        });
      }

      return created;
    });

    return { id: experience.id, slug: experience.slug };
  } catch (error) {
    await deleteStoredFiles(storedKeys);
    throw error;
  }
}

export async function updateDraftExperience(
  experienceId: string,
  userId: string,
  input: ExperienceUpdateInput,
): Promise<{ id: string }> {
  const current = await requireFullExperience(prisma, experienceId);
  assertOwner(current, userId);

  if (current.status !== "draft" || current.recordHash) {
    throw new ApiError(
      409,
      "SIGNED_RECORD_IMMUTABLE",
      "Signed records are immutable. Unpublish and duplicate the record to make substantive changes.",
    );
  }
  if (current.witnesses.length > 0) {
    throw new ApiError(
      409,
      "WITNESSES_EXIST",
      "This record already has witness invitations and can no longer be edited as a draft.",
    );
  }

  const startAt = input.startAt ?? current.startAt;
  const endAt = input.endAt ?? current.endAt;
  if (endAt <= startAt) {
    throw new ApiError(422, "VALIDATION_ERROR", "End time must be after start time.");
  }

  const coordinateUpdate: Prisma.ExperienceUpdateInput = {};
  if (input.latitude !== undefined && input.longitude !== undefined) {
    coordinateUpdate.latitudeEnc = encryptNumber(input.latitude);
    coordinateUpdate.longitudeEnc = encryptNumber(input.longitude);
  }

  const placeOrTimeChanged =
    (input.locationName !== undefined && input.locationName !== current.locationName) ||
    (input.startAt !== undefined && input.startAt.getTime() !== current.startAt.getTime()) ||
    (input.endAt !== undefined && input.endAt.getTime() !== current.endAt.getTime()) ||
    input.latitude !== undefined ||
    input.longitude !== undefined;

  await prisma.$transaction(async (tx) => {
    await tx.experience.update({
      where: { id: experienceId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.category !== undefined
          ? { category: input.category as Category }
          : {}),
        ...(input.locationName !== undefined
          ? { locationName: input.locationName }
          : {}),
        ...coordinateUpdate,
        ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
        ...(input.endAt !== undefined ? { endAt: input.endAt } : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility as Visibility }
          : {}),
        ...(input.showExactLocation !== undefined
          ? { showExactLocation: input.showExactLocation }
          : {}),
        ...(placeOrTimeChanged && current.locationConfirmedAt
          ? { locationConfirmedAt: null }
          : {}),
      },
    });

    if (input.claims) {
      await tx.claim.deleteMany({ where: { experienceId } });
      await tx.claim.createMany({
        data: input.claims.map((claim, index) => ({
          experienceId,
          position: index + 1,
          text: claim.text,
          evidence: claim.evidence ?? null,
        })),
      });
    }

    if (input.participants) {
      await tx.participant.deleteMany({ where: { experienceId } });
      await tx.participant.createMany({
        data: input.participants.map((participant, index) => ({
          experienceId,
          position: index + 1,
          name: participant.name,
          role: participant.role,
          email: participant.email ?? null,
        })),
      });
    }
  });

  return { id: experienceId };
}

export async function addMediaToDraft(
  experienceId: string,
  userId: string,
  images: PreparedMedia[],
  coverMediaIndex?: number,
): Promise<{ count: number }> {
  if (images.length === 0) {
    throw new ApiError(422, "NO_FILES", "Choose at least one image to upload.");
  }

  const current = await requireFullExperience(prisma, experienceId);
  assertOwner(current, userId);
  if (current.status !== "draft" || current.recordHash) {
    throw new ApiError(
      409,
      "SIGNED_RECORD_IMMUTABLE",
      "Media can only be added while the record is an unsigned draft.",
    );
  }
  if (current.media.length + images.length > MAX_IMAGES_PER_RECORD) {
    throw new ApiError(
      422,
      "TOO_MANY_IMAGES",
      `A record can include at most ${MAX_IMAGES_PER_RECORD} images.`,
    );
  }

  if (
    coverMediaIndex !== undefined &&
    (coverMediaIndex < 0 || coverMediaIndex >= images.length)
  ) {
    throw new ApiError(
      422,
      "INVALID_COVER",
      "Choose a cover image from the uploaded files.",
    );
  }
  const shouldCover =
    coverMediaIndex !== undefined
      ? images.map((_, index) => index === coverMediaIndex)
      : images.map((_, index) => current.media.length === 0 && index === 0);
  const prepared = images.map((image, index) => ({
    ...image,
    data: { ...image.data, isCover: shouldCover[index] },
  }));

  const storedKeys = await storePreparedImages(prepared);
  try {
    await prisma.$transaction(async (tx) => {
      if (shouldCover.some(Boolean)) {
        await tx.mediaAsset.updateMany({
          where: { experienceId },
          data: { isCover: false },
        });
      }

      const cameraEvidence = prepared.find(
        (image) => image.data.exif?.cameraMake || image.data.exif?.cameraModel,
      );

      for (const image of prepared) {
        const media = await tx.mediaAsset.create({
          data: {
            experienceId,
            ...image.data,
            exif: image.data.exif ?? Prisma.JsonNull,
          },
        });
        await appendEvidenceEvent(tx, {
          experienceId,
          type: "media_uploaded",
          actorId: userId,
          payload: {
            mediaId: media.id,
            sha256: media.sha256,
            mimeType: media.mimeType,
          },
        });
      }

      if (cameraEvidence && !current.deviceAttestedAt) {
        await tx.experience.update({
          where: { id: experienceId },
          data: { deviceAttestedAt: new Date() },
        });
        await appendEvidenceEvent(tx, {
          experienceId,
          type: "device_attested",
          actorId: userId,
          payload: {
            source: "exif",
            cameraMake: cameraEvidence.data.exif?.cameraMake ?? null,
            cameraModel: cameraEvidence.data.exif?.cameraModel ?? null,
          },
        });
      }
    });
  } catch (error) {
    await deleteStoredFiles(storedKeys);
    throw error;
  }

  return { count: prepared.length };
}

export async function addExperienceEvidence(
  experienceId: string,
  userId: string,
  input: {
    type: "location_confirmed" | "device_attested";
    note?: string;
  },
): Promise<{ type: string }> {
  await prisma.$transaction(async (tx) => {
    const current = await requireFullExperience(tx, experienceId);
    assertOwner(current, userId);
    if (current.status === "flagged" || current.status === "revoked") {
      throw new ApiError(
        409,
        "RECORD_LOCKED",
        "This record cannot receive new evidence while flagged or revoked.",
      );
    }
    assertIntegrityNotAltered(current);

    if (input.type === "location_confirmed") {
      if (current.locationConfirmedAt) {
        throw new ApiError(
          409,
          "EVIDENCE_EXISTS",
          "Location has already been confirmed for this record.",
        );
      }
      await tx.experience.update({
        where: { id: experienceId },
        data: { locationConfirmedAt: new Date() },
      });
    } else {
      if (current.deviceAttestedAt) {
        throw new ApiError(
          409,
          "EVIDENCE_EXISTS",
          "Device context has already been recorded for this record.",
        );
      }
      await tx.experience.update({
        where: { id: experienceId },
        data: { deviceAttestedAt: new Date() },
      });
    }

    await appendEvidenceEvent(tx, {
      experienceId,
      type: input.type,
      actorId: userId,
      payload: {
        source: "creator_confirmation",
        ...(input.note ? { note: input.note } : {}),
      },
    });

    const after = await requireFullExperience(tx, experienceId);
    if (after.recordHash) {
      await sealExperience(tx, experienceId);
    }
  });

  return { type: input.type };
}

export async function setPublishState(
  experienceId: string,
  userId: string,
  action: "publish" | "unpublish",
): Promise<{
  status: string;
  trustLevel: string;
  recordHash: string | null;
}> {
  return prisma.$transaction(async (tx) => {
    const current = await requireFullExperience(tx, experienceId);
    assertOwner(current, userId);

    if (current.status === "flagged" || current.status === "revoked") {
      throw new ApiError(
        409,
        "RECORD_LOCKED",
        "This record cannot be published or unpublished while flagged or revoked.",
      );
    }
    if (action === "publish" && current.visibility === "private") {
      throw new ApiError(
        422,
        "PRIVATE_RECORD",
        "Choose public or unlisted visibility before publishing.",
      );
    }
    if (action === "publish" && current.status === "published") {
      throw new ApiError(409, "ALREADY_PUBLISHED", "This record is already published.");
    }
    if (action === "unpublish" && current.status !== "published") {
      throw new ApiError(409, "NOT_PUBLISHED", "This record is not published.");
    }

    assertIntegrityNotAltered(current);

    if (action === "publish") {
      await tx.experience.update({
        where: { id: experienceId },
        data: {
          status: "published",
          publishedAt: current.publishedAt ?? new Date(),
        },
      });
      await appendEvidenceEvent(tx, {
        experienceId,
        type: "published",
        actorId: userId,
        payload: { visibility: current.visibility },
      });
    } else {
      const nextStatus = witnessProgressionStatus(current, true);
      await tx.experience.update({
        where: { id: experienceId },
        data: { status: nextStatus },
      });
      await appendEvidenceEvent(tx, {
        experienceId,
        type: "unpublished",
        actorId: userId,
        payload: { previousStatus: current.status },
      });
    }

    const seal = await sealExperience(tx, experienceId);
    return {
      status: action === "publish" ? "published" : witnessProgressionStatus(current, true),
      trustLevel: seal.trustLevel,
      recordHash: seal.recordHash,
    };
  });
}

export async function revokeExperienceByOwner(
  experienceId: string,
  userId: string,
): Promise<{ status: "revoked" }> {
  await prisma.$transaction(async (tx) => {
    const current = await requireFullExperience(tx, experienceId);
    assertOwner(current, userId);
    if (current.status === "revoked") {
      throw new ApiError(409, "ALREADY_REVOKED", "This record is already revoked.");
    }
    if (current.status === "flagged") {
      throw new ApiError(
        409,
        "RECORD_FLAGGED",
        "A flagged record can only be restored or revoked by an administrator.",
      );
    }
    assertIntegrityNotAltered(current);

    await tx.experience.update({
      where: { id: experienceId },
      data: { status: "revoked", revokedAt: new Date() },
    });
    await appendEvidenceEvent(tx, {
      experienceId,
      type: "revoked",
      actorId: userId,
      payload: { source: "creator" },
    });
    await sealExperience(tx, experienceId);
  });

  return { status: "revoked" };
}

export async function deleteExperience(
  experienceId: string,
  userId: string,
): Promise<void> {
  const experience = await requireFullExperience(prisma, experienceId);
  assertOwner(experience, userId);
  const storageKeys = experience.media.map((asset) => asset.storageKey);
  await prisma.experience.delete({ where: { id: experienceId } });
  await deleteStoredFiles(storageKeys);
}

export async function getUserExperiences(userId: string) {
  return prisma.experience.findMany({
    where: { creatorId: userId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          claims: true,
          media: true,
          witnesses: true,
          attestations: true,
        },
      },
    },
  });
}

export async function getOwnedExperience(
  experienceId: string,
  userId: string,
): Promise<FullExperience> {
  const experience = await requireFullExperience(prisma, experienceId);
  assertOwner(experience, userId);
  return experience;
}


export async function setExperienceVisibility(
  experienceId: string,
  userId: string,
  visibility: Visibility,
): Promise<{ visibility: Visibility }> {
  const current = await requireFullExperience(prisma, experienceId);
  assertOwner(current, userId);
  if (current.status === "flagged" || current.status === "revoked") {
    throw new ApiError(
      409,
      "RECORD_LOCKED",
      "Visibility cannot be changed while the record is flagged or revoked.",
    );
  }
  if (current.status === "published") {
    throw new ApiError(
      409,
      "UNPUBLISH_FIRST",
      "Unpublish this record before changing its visibility.",
    );
  }
  assertIntegrityNotAltered(current);
  await prisma.experience.update({
    where: { id: experienceId },
    data: { visibility },
  });
  return { visibility };
}
