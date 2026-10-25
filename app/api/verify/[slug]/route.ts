import {
  ApiError,
  apiErrorResponse,
  enforceRateLimit,
  getClientIp,
} from "@/lib/api";
import { sanitizeFileName } from "@/lib/crypto";
import { getPublicVerification } from "@/lib/services/public-verification";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    if (!slug || slug.length > 140) {
      throw new ApiError(404, "NOT_FOUND", "This record could not be found.");
    }
    enforceRateLimit({
      key: `verify-json:${getClientIp(request)}:${slug}`,
      limit: 90,
      windowMs: 60 * 1000,
    });

    const view = await getPublicVerification(slug);
    if (!view) {
      throw new ApiError(
        404,
        "NOT_FOUND",
        "This record is not available for public verification.",
      );
    }

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "1";
    const body = JSON.stringify(view.document, null, 2);
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Proof-Record-Hash": view.document.integrity.recordHash ?? "unsealed",
    });
    if (download) {
      const fileName = `proof-of-experience-${sanitizeFileName(slug)}.json`;
      headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    }

    return new Response(body, { status: 200, headers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
