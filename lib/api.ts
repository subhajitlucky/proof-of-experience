import type { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { ZodError, z, type ZodTypeAny } from "zod";
import { authOptions } from "./auth";
import { prisma } from "./db";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { details?: unknown; headers?: Record<string, string> },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.headers = options?.headers;
  }
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  handle: string;
  role: Role;
  avatarUrl: string | null;
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store",
          ...(error.headers ?? {}),
        },
      },
    );
  }

  console.error("Unhandled API error", error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred. Please try again.",
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function apiData(data: unknown, status = 200): Response {
  return Response.json(
    { data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function parseInput<TSchema extends ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): z.infer<TSchema> {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(
        422,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        {
          details: error.issues.slice(0, 20).map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      );
    }
    throw error;
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Send this request as application/json.",
    );
  }
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new ApiError(
      403,
      "CSRF_CHECK_FAILED",
      "This request must originate from the application.",
    );
  }

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // Ignore malformed request URLs.
  }
  for (const configured of [process.env.APP_URL, process.env.NEXTAUTH_URL]) {
    if (!configured) continue;
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // Ignore malformed environment configuration.
    }
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (process.env.NODE_ENV === "production" ? "https" : "http");
    allowed.add(`${protocol}://${host.split(",")[0].trim()}`);
  }

  if (!allowed.has(origin)) {
    throw new ApiError(
      403,
      "CSRF_CHECK_FAILED",
      "The request origin is not allowed.",
    );
  }
}

export async function requireApiUser(): Promise<ApiUser> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in to continue.");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      handle: true,
      role: true,
      avatarUrl: true,
    },
  });
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "This account no longer exists.");
  }
  return user;
}

export async function requireAdminApi(): Promise<ApiUser> {
  const user = await requireApiUser();
  if (user.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Administrator access is required.");
  }
  return user;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "local";
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();
let requestsSinceSweep = 0;

const DISABLED = process.env.NODE_ENV === "test";

/**
 * Process-local fixed-window limiting for the MVP. A production deployment
 * behind more than one process should replace this with Redis/Upstash.
 */
export function enforceRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): void {
  if (DISABLED) return;

  const now = Date.now();
  requestsSinceSweep += 1;
  if (requestsSinceSweep > 2_000) {
    requestsSinceSweep = 0;
    for (const [bucketKey, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  let entry = buckets.get(input.key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + input.windowMs };
    buckets.set(input.key, entry);
  }
  entry.count += 1;

  if (entry.count > input.limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    throw new ApiError(
      429,
      "RATE_LIMITED",
      "Too many requests. Please try again shortly.",
      {
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(input.limit),
          "X-RateLimit-Remaining": "0",
        },
        details: { retryAfterSeconds: retryAfter },
      },
    );
  }
}

export function idempotencyKey(prefix: string, request: Request): string {
  return `${prefix}:${getClientIp(request)}`;
}
