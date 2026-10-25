import {
  ApiError,
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  getClientIp,
  parseInput,
  readJson,
  requireSameOrigin,
} from "@/lib/api";
import { sha256Hex } from "@/lib/crypto";
import {
  getInvitation,
  submitAttestation,
} from "@/lib/services/witnesses";
import {
  attestationSubmissionSchema,
  attestationTokenSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ token: string }>;
}

function tokenKey(token: string): string {
  return sha256Hex(token).slice(0, 24);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const rawToken = parseInput(attestationTokenSchema, token);
    enforceRateLimit({
      key: `attestation-get:${tokenKey(rawToken)}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 10 * 60 * 1000,
    });
    const invitation = await getInvitation(rawToken);
    if (invitation.state === "not_found") {
      throw new ApiError(
        404,
        "ATTESTATION_NOT_FOUND",
        "This attestation link is not valid.",
      );
    }
    return apiData(invitation);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const { token } = await context.params;
    const rawToken = parseInput(attestationTokenSchema, token);
    enforceRateLimit({
      key: `attestation-post:${tokenKey(rawToken)}:${getClientIp(request)}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    const body = await readJson(request);
    const input = parseInput(attestationSubmissionSchema, body);
    const result = await submitAttestation(rawToken, input);
    return apiData(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
