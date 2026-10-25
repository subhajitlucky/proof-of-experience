import {
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  readJson,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import { inviteWitness } from "@/lib/services/witnesses";
import { inviteWitnessSchema } from "@/lib/validation";

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
      key: `invite-witness:${user.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    const body = await readJson(request);
    const input = parseInput(inviteWitnessSchema, body);
    const result = await inviteWitness(id, user.id, input);
    return apiData(result, 201);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
