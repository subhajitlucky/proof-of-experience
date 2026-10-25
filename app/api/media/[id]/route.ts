import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const media = await prisma.mediaAsset.findUnique({
      where: { id },
      include: {
        experience: {
          select: {
            creatorId: true,
            visibility: true,
            publishedAt: true,
            status: true,
          },
        },
      },
    });
    if (!media) return new Response("Not found", { status: 404 });

    const publiclyVisible =
      media.experience.visibility !== "private" &&
      Boolean(media.experience.publishedAt) &&
      ["published", "flagged", "revoked"].includes(media.experience.status);

    let allowed = publiclyVisible;
    if (!allowed) {
      const user = await getCurrentUser();
      allowed =
        Boolean(user) &&
        (user?.id === media.experience.creatorId || user?.role === "admin");
    }
    if (!allowed) return new Response("Not found", { status: 404 });

    let data: Buffer;
    try {
      data = await getStorage().get(media.storageKey);
    } catch {
      return new Response("Not found", { status: 404 });
    }

    const extension = media.mimeType === "image/jpeg" ? "jpg" : media.mimeType.split("/")[1] || "img";
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(data.byteLength),
        "Content-Disposition": `inline; filename="evidence-${media.id}.${extension}"`,
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (error) {
    console.error("Media read failed", error);
    return new Response("Not found", { status: 404 });
  }
}
