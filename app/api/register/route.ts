import { Prisma } from "@prisma/client";
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
import { prisma } from "@/lib/db";
import { createCredentialUser } from "@/lib/users";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    enforceRateLimit({
      key: `register:${getClientIp(request)}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    const body = await readJson(request);
    const input = parseInput(registerSchema, body);

    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new ApiError(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists.",
      );
    }
    const existingHandle = await prisma.user.findUnique({
      where: { handle: input.handle },
      select: { id: true },
    });
    if (existingHandle) {
      throw new ApiError(409, "HANDLE_IN_USE", "This handle is already taken.");
    }

    const user = await createCredentialUser(input);
    return apiData(
      { id: user.id, handle: user.handle, name: user.name, email: user.email },
      201,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiErrorResponse(
        new ApiError(
          409,
          "ACCOUNT_EXISTS",
          "An account with this email or handle already exists.",
        ),
      );
    }
    return apiErrorResponse(error);
  }
}
