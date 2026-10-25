import {
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  readJson,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { addExperienceEvidence } from "@/lib/services/experiences";
import { evidenceActionSchema } from "@/lib/validation";

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
      key: `evidence:${user.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    const input = parseInput(evidenceActionSchema, await readJson(request));
    const result = await addExperienceEvidence(id, user.id, input);
    return apiData(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
