import {
  ApiError,
  apiErrorResponse,
  enforceRateLimit,
  getClientIp,
} from "@/lib/api";
import { renderBadgeSvg } from "@/lib/badge";
import { absoluteUrl } from "@/lib/format";
import { getPublicVerification } from "@/lib/services/public-verification";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    enforceRateLimit({
      key: `badge:${getClientIp(request)}`,
      limit: 240,
      windowMs: 60 * 1000,
    });
    const { slug } = await context.params;
    const view = await getPublicVerification(slug);
    if (!view) {
      throw new ApiError(
        404,
        "NOT_FOUND",
        "This record is not available for public verification.",
      );
    }

    const document = view.document;
    const svg = renderBadgeSvg({
      trustLabel: document.trust.label,
      status: document.record.status,
      altered: document.integrity.altered,
      verifyUrl: absoluteUrl(`/verify/${document.record.slug}`),
    });

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=15, s-maxage=15",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
