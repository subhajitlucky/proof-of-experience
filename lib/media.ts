import { randomUUID } from "node:crypto";
import exifr from "exifr";
import sharp from "sharp";
import { encryptNumber, safeEqual, sha256Hex } from "./crypto";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./media-constants";

export interface PreparedMedia {
  buffer: Buffer;
  data: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
    sha256: string;
    capturedAt: Date;
    exif: Record<string, string | null> | null;
    gpsPresent: boolean;
    latitudeEnc: string | null;
    longitudeEnc: string | null;
    isCover: boolean;
  };
}

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function cleanMetaString(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function validDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

async function readExif(buffer: Buffer): Promise<{
  capturedAt: Date | null;
  exif: Record<string, string | null> | null;
  latitude: number | null;
  longitude: number | null;
}> {
  try {
    const parsed = (await exifr.parse(buffer, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
      ],
      translateValues: false,
      reviveValues: true,
    })) as Record<string, unknown> | undefined;

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const gps = await exifr.gps(buffer);
      if (
        gps &&
        Number.isFinite(gps.latitude) &&
        Number.isFinite(gps.longitude) &&
        gps.latitude >= -90 &&
        gps.latitude <= 90 &&
        gps.longitude >= -180 &&
        gps.longitude <= 180
      ) {
        latitude = gps.latitude;
        longitude = gps.longitude;
      }
    } catch {
      // GPS is optional.
    }

    const cameraMake = cleanMetaString(parsed?.Make);
    const cameraModel = cleanMetaString(parsed?.Model);
    const lensModel = cleanMetaString(parsed?.LensModel);
    const exif =
      cameraMake || cameraModel || lensModel
        ? {
            cameraMake,
            cameraModel,
            lensModel,
          }
        : null;

    return {
      capturedAt:
        validDate(parsed?.DateTimeOriginal) ??
        validDate(parsed?.CreateDate) ??
        validDate(parsed?.ModifyDate),
      exif,
      latitude,
      longitude,
    };
  } catch {
    return { capturedAt: null, exif: null, latitude: null, longitude: null };
  }
}

export async function prepareImageBuffer(input: {
  buffer: Buffer;
  fileName: string;
  declaredMimeType?: string;
  fallbackCapturedAt?: Date;
  isCover?: boolean;
}): Promise<PreparedMedia> {
  if (input.buffer.byteLength === 0) {
    throw new Error("The uploaded image is empty");
  }
  if (input.buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be smaller than 8 MB");
  }

  const detectedMime = sniffImageMime(input.buffer);
  if (!detectedMime || !ALLOWED_IMAGE_TYPES.has(detectedMime)) {
    throw new Error("Images must be JPEG, PNG, or WebP");
  }
  if (
    input.declaredMimeType &&
    ALLOWED_IMAGE_TYPES.has(input.declaredMimeType) &&
    !safeEqual(input.declaredMimeType, detectedMime)
  ) {
    throw new Error("The file contents do not match the image type");
  }

  const exifData = await readExif(input.buffer);

  // Re-encode the image after reading EXIF. This intentionally strips embedded
  // EXIF (including GPS) so private coordinates cannot leak through the served
  // image file. Public hashes are computed over the sanitised bytes we store.
  let buffer: Buffer;
  try {
    const pipeline = sharp(input.buffer, {
      limitInputPixels: 50_000_000,
      failOn: "error",
    }).rotate();
    if (detectedMime === "image/jpeg") {
      buffer = await pipeline.jpeg({ quality: 92 }).toBuffer();
    } else if (detectedMime === "image/webp") {
      buffer = await pipeline.webp({ quality: 92 }).toBuffer();
    } else {
      buffer = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    }
  } catch {
    throw new Error("The image could not be decoded safely");
  }

  const capturedAt =
    exifData.capturedAt ??
    (input.fallbackCapturedAt && !Number.isNaN(input.fallbackCapturedAt.getTime())
      ? input.fallbackCapturedAt
      : new Date());
  const sha256 = sha256Hex(buffer);
  const cleanName = input.fileName
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120) || "image";
  const extension = detectedMime.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  const now = new Date();
  const storageKey = [
    "media",
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    `${randomUUID()}.${extension}`,
  ].join("/");

  return {
    buffer,
    data: {
      storageKey,
      fileName: cleanName,
      mimeType: detectedMime,
      size: buffer.byteLength,
      sha256,
      capturedAt,
      exif: exifData.exif,
      gpsPresent: exifData.latitude !== null && exifData.longitude !== null,
      latitudeEnc:
        exifData.latitude !== null ? encryptNumber(exifData.latitude) : null,
      longitudeEnc:
        exifData.longitude !== null ? encryptNumber(exifData.longitude) : null,
      isCover: input.isCover ?? false,
    },
  };
}

export async function prepareImageFile(
  file: File,
  options?: { isCover?: boolean },
): Promise<PreparedMedia> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Each image must be smaller than 8 MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return prepareImageBuffer({
    buffer,
    fileName: file.name,
    declaredMimeType: file.type || undefined,
    fallbackCapturedAt: new Date(file.lastModified || Date.now()),
    isCover: options?.isCover,
  });
}
