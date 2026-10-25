import { Prisma } from "@prisma/client";
import {
  ApiError,
  apiData,
  apiErrorResponse,
  enforceRateLimit,
  parseInput,
  readJson,
  requireApiUser,
  requireSameOrigin,
} from "@/lib/api";
import {
  deleteAccountAndData,
  updateUserProfile,
} from "@/lib/users";
import {
  deleteAccountSchema,
  profileUpdateSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit({
      key: `profile:${user.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    const input = parseInput(profileUpdateSchema, await readJson(request));
    const updated = await updateUserProfile(user.id, input);
    return apiData({
      id: updated.id,
      name: updated.name,
      handle: updated.handle,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiErrorResponse(
        new ApiError(409, "HANDLE_IN_USE", "This handle is already taken."),
      );
    }
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireApiUser();
    enforceRateLimit({
      key: `delete-account:${user.id}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    parseInput(deleteAccountSchema, await readJson(request));
    await deleteAccountAndData(user.id);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
