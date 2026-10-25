import {
  ApiError,
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  readJson,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { prepareImageFile } from "@/lib/media";
import { MAX_IMAGES_PER_RECORD } from "@/lib/media-constants";
import { createExperience, getUserExperiences } from "@/lib/services/experiences";
import { serializeExperienceSummary } from "@/lib/serializers";
import { experienceCreateSchema } from "@/lib/validation";
import type { PreparedMedia } from "@/lib/media";

export const runtime = "nodejs";

function formString(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

function parseFormJson(form: FormData, key: string, fallback: unknown): unknown {
  const raw = formString(form, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      `The ${key} field is not valid JSON.`,
    );
  }
}

async function prepareFormImages(files: File[]): Promise<PreparedMedia[]> {
  try {
    return await Promise.all(files.map((file) => prepareImageFile(file)));
  } catch (error) {
    throw new ApiError(
      422,
      "INVALID_IMAGE",
      error instanceof Error ? error.message : "The image could not be processed.",
    );
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit({
      key: `create-experience:${user.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > 72 * 1024 * 1024) {
      throw new ApiError(
        413,
        "PAYLOAD_TOO_LARGE",
        "The upload is too large. Keep images under 8 MB each.",
      );
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    let input;
    let images: PreparedMedia[] = [];
    let coverIndex: number | undefined;

    if (contentType.includes("multipart/form-data")) {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        throw new ApiError(
          400,
          "INVALID_FORM",
          "The multipart form body could not be read.",
        );
      }

      const rawFiles = [
        ...form.getAll("images"),
        ...form.getAll("files"),
      ].filter((value): value is File => value instanceof File && value.size > 0);

      if (rawFiles.length > MAX_IMAGES_PER_RECORD) {
        throw new ApiError(
          422,
          "TOO_MANY_IMAGES",
          `A record can include at most ${MAX_IMAGES_PER_RECORD} images.`,
        );
      }

      const rawCover = formString(form, "coverIndex");
      if (rawCover !== undefined && rawCover !== "") {
        const parsed = Number(rawCover);
        if (!Number.isInteger(parsed)) {
          throw new ApiError(422, "INVALID_COVER", "Choose a valid cover image.");
        }
        coverIndex = parsed;
      }

      const candidate = {
        title: formString(form, "title"),
        summary: formString(form, "summary"),
        category: formString(form, "category"),
        locationName: formString(form, "locationName"),
        latitude: formString(form, "latitude"),
        longitude: formString(form, "longitude"),
        startAt: formString(form, "startAt"),
        endAt: formString(form, "endAt"),
        visibility: formString(form, "visibility"),
        showExactLocation: formString(form, "showExactLocation"),
        confirmLocation: formString(form, "confirmLocation"),
        claims: parseFormJson(form, "claims", []),
        participants: parseFormJson(form, "participants", []),
      };
      input = parseInput(experienceCreateSchema, candidate);
      images = await prepareFormImages(rawFiles);
    } else if (contentType.includes("application/json")) {
      const body = await readJson(request);
      input = parseInput(experienceCreateSchema, body);
    } else {
      throw new ApiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send JSON or multipart form data.",
      );
    }

    const result = await createExperience(user.id, {
      ...input,
      images,
      coverIndex,
    });

    return apiData(
      {
        id: result.id,
        slug: result.slug,
        dashboardUrl: `/dashboard/experiences/${result.id}`,
      },
      201,
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const experiences = await getUserExperiences(user.id);
    return apiData({
      experiences: experiences.map(serializeExperienceSummary),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
