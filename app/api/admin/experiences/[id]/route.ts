import {
  apiData,
  apiErrorResponse,
  parseInput,
  readJson,
  requireAdminApi,
  requireSameOrigin,
} from "@/lib/api";
import { applyAdminAction } from "@/lib/services/admin";
import { adminActionSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const admin = await requireAdminApi();
    const { id } = await context.params;
    const input = parseInput(adminActionSchema, await readJson(request));
    const result = await applyAdminAction({
      experienceId: id,
      actor: { id: admin.id, name: admin.name },
      action: input.action,
      reason: input.reason,
    });
    return apiData(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
