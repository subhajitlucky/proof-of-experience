import {
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { revokeExperienceByOwner } from "@/lib/services/experiences";

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
      key: `revoke:${user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    const result = await revokeExperienceByOwner(id, user.id);
    return apiData(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
