import {
  ApiError,
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { setPublishState } from "@/lib/services/experiences";
import { publishSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function optionalJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return {};
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await context.params;
    enforceRateLimit({
      key: `publish:${user.id}`,
      limit: 120,
      windowMs: 60 * 60 * 1000,
    });
    const body = await optionalJsonBody(request);
    const input = parseInput(publishSchema, body);
    const result = await setPublishState(id, user.id, input.action);
    return apiData(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
