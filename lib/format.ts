import type {
  Category,
  ExperienceStatus,
  TrustLevel,
  Visibility,
} from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  craft: "Craft",
  travel: "Travel",
  food: "Food",
  art: "Art",
  event: "Event",
  other: "Other",
};

export const STATUS_LABELS: Record<ExperienceStatus, string> = {
  draft: "Draft",
  evidence_pending: "Evidence pending",
  witness_verified: "Witness verified",
  published: "Published",
  flagged: "Flagged",
  revoked: "Revoked",
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
};

export const TRUST_LABELS: Record<TrustLevel, string> = {
  self_attested: "Self-attested",
  location_verified: "Location verified",
  device_verified: "Device verified",
  witness_verified: "Witness verified",
  fully_verified: "Fully verified",
};

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const utcTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const utcDateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDate(value: string | Date): string {
  return longDate.format(new Date(value));
}

export function formatShortDate(value: string | Date): string {
  return shortDate.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return utcDateTime.format(new Date(value));
}

export function formatTime(value: string | Date): string {
  return utcTime.format(new Date(value));
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10);
  if (sameDay) {
    return `${formatDate(startDate)} · ${formatTime(startDate)}–${formatTime(endDate)} UTC`;
  }
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export function shortHash(hash: string | null, length = 12): string {
  if (!hash) return "Not sealed";
  return `${hash.slice(0, length)}…${hash.slice(-6)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function displayHandle(handle: string): string {
  return `@${handle}`;
}

export function toDateTimeLocalValue(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatCoordinate(value: number): string {
  return value.toFixed(5);
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as Category] ?? category;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ExperienceStatus] ?? status;
}

export function trustLabel(level: string): string {
  return TRUST_LABELS[level as TrustLevel] ?? level;
}

export function visibilityLabel(visibility: string): string {
  return VISIBILITY_LABELS[visibility as Visibility] ?? visibility;
}

export function statusTone(
  status: string,
  altered = false,
): "neutral" | "good" | "warning" | "danger" {
  if (altered) return "danger";
  if (status === "revoked") return "danger";
  if (status === "flagged") return "warning";
  if (status === "published") return "good";
  return "neutral";
}

export function publicVerifyPath(slug: string): string {
  return `/verify/${slug}`;
}

export function absoluteUrl(path: string): string {
  const base = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
