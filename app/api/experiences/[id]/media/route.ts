import {
  ApiError,
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { prepareImageFile, type PreparedMedia } from "@/lib/media";
import { MAX_IMAGES_PER_RECORD } from "@/lib/media-constants";
import { addMediaToDraft } from "@/lib/services/experiences";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await context.params;
    enforceRateLimit({
      key: `upload-media:${user.id}`,
      limit: 40,
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
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      throw new ApiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send images as multipart form data.",
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "The upload could not be read.");
    }
    const files = [
      ...form.getAll("images"),
      ...form.getAll("files"),
    ].filter((value): value is File => value instanceof File && value.size > 0);
    if (files.length === 0) {
      throw new ApiError(422, "NO_FILES", "Choose at least one image.");
    }
    if (files.length > MAX_IMAGES_PER_RECORD) {
      throw new ApiError(
        422,
        "TOO_MANY_IMAGES",
        `Upload at most ${MAX_IMAGES_PER_RECORD} images at a time.`,
      );
    }

    let images: PreparedMedia[];
    try {
      images = await Promise.all(files.map((file) => prepareImageFile(file)));
    } catch (error) {
      throw new ApiError(
        422,
        "INVALID_IMAGE",
        error instanceof Error
          ? error.message
          : "The image could not be processed.",
      );
    }

    const coverIndexRaw = form.get("coverIndex");
    const coverIndex =
      typeof coverIndexRaw === "string" && coverIndexRaw !== ""
        ? Number(coverIndexRaw)
        : undefined;
    if (
      coverIndex !== undefined &&
      (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= images.length)
    ) {
      throw new ApiError(422, "INVALID_COVER", "Choose a valid cover image.");
    }

    const result = await addMediaToDraft(id, user.id, images, coverIndex);
    return apiData(result, 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
