import { prisma } from "../db";
import { decryptNumber } from "../crypto";
import {
  experienceFullInclude,
  type FullExperience,
} from "../record";
import {
  buildVerificationDocument,
  isPubliclyVisible,
  type VerificationDocument,
} from "../verification";

export async function findPublicExperienceBySlug(
  slug: string,
): Promise<FullExperience | null> {
  if (!slug || slug.length > 140) return null;
  const experience = (await prisma.experience.findUnique({
    where: { slug },
    include: experienceFullInclude,
  })) as FullExperience | null;
  if (!experience || !isPubliclyVisible(experience)) return null;
  return experience;
}

export interface PublicVerificationView {
  document: VerificationDocument;
  coverPublicUrl: string | null;
  exactCoordinates: { latitude: number; longitude: number } | null;
}

export async function getPublicVerification(
  slug: string,
): Promise<PublicVerificationView | null> {
  const experience = await findPublicExperienceBySlug(slug);
  if (!experience) return null;
  const document = buildVerificationDocument(experience);
  const cover = experience.media.find((asset) => asset.isCover) ?? experience.media[0];
  let exactCoordinates: { latitude: number; longitude: number } | null = null;
  if (
    experience.showExactLocation &&
    experience.latitudeEnc &&
    experience.longitudeEnc
  ) {
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
    document,
    coverPublicUrl: cover ? `/api/media/${cover.id}` : null,
    exactCoordinates,
  };
}

export async function getFeaturedDemo(): Promise<{
  document: VerificationDocument;
  coverPublicUrl: string | null;
} | null> {
  const candidates = (await prisma.experience.findMany({
    where: {
      isDemo: true,
      visibility: "public",
      status: "published",
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "asc" },
    take: 5,
    include: experienceFullInclude,
  })) as FullExperience[];

  const valid = candidates.find(
    (candidate) => !buildVerificationDocument(candidate).integrity.altered,
  );
  if (!valid) return null;
  const cover = valid.media.find((asset) => asset.isCover) ?? valid.media[0];
  return {
    document: buildVerificationDocument(valid),
    coverPublicUrl: cover ? `/api/media/${cover.id}` : null,
  };
}
