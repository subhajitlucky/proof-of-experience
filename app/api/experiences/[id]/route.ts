import {
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  readJson,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import {
  deleteExperience,
  getOwnedExperience,
  updateDraftExperience,
} from "@/lib/services/experiences";
import { serializeOwnerExperience } from "@/lib/serializers";
import { experienceUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireApiUser();
    const { id } = await context.params;
    const experience = await getOwnedExperience(id, user.id);
    return apiData(serializeOwnerExperience(experience));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await context.params;
    enforceRateLimit({
      key: `update-experience:${user.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    const body = await readJson(request);
    const input = parseInput(experienceUpdateSchema, body);
    await updateDraftExperience(id, user.id, input);
    return apiData({ id, updated: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    const { id } = await context.params;
    enforceRateLimit({
      key: `delete-experience:${user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await deleteExperience(id, user.id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
