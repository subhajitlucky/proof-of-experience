import type { AuditAction, ExperienceStatus } from "@prisma/client";
import { ApiError } from "../api";
import { prisma } from "../db";
import { appendEvidenceEvent } from "../evidence";
import {
  analyzeIntegrity,
} from "../verification";
import {
  requireFullExperience,
  sealExperience,
} from "./records";

export async function getAdminOverview() {
  const [records, flagged, auditLog, counts] = await Promise.all([
    prisma.experience.findMany({
      where: {
        publishedAt: { not: null },
        status: { in: ["published", "flagged", "revoked"] },
      },
      orderBy: [{ flaggedAt: "desc" }, { updatedAt: "desc" }],
      take: 50,
      include: {
        creator: {
          select: { name: true, handle: true, email: true },
        },
        _count: {
          select: { attestations: true, claims: true, media: true },
        },
      },
    }),
    prisma.experience.count({ where: { status: "flagged" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    Promise.all([
      prisma.experience.count({ where: { publishedAt: { not: null } } }),
      prisma.experience.count({ where: { status: "revoked" } }),
      prisma.attestation.count(),
    ]),
  ]);

  return {
    records,
    flaggedCount: flagged,
    auditLog,
    totals: {
      published: counts[0],
      revoked: counts[1],
      attestations: counts[2],
    },
  };
}

function restoredStatus(experience: {
  publishedAt: Date | null;
  status: ExperienceStatus;
  recordHash: string | null;
}): ExperienceStatus {
  return experience.publishedAt ? "published" : "evidence_pending";
}

export async function applyAdminAction(input: {
  experienceId: string;
  actor: { id: string; name: string };
  action: "flag" | "unflag" | "revoke" | "restore";
  reason: string;
}): Promise<{ status: string; integrityAltered: boolean }> {
  return prisma.$transaction(async (tx) => {
    const current = await requireFullExperience(tx, input.experienceId);
    if (!current.publishedAt) {
      throw new ApiError(
        409,
        "NOT_IN_PUBLIC_RECORD",
        "Administrative actions apply to records that have entered public verification.",
      );
    }

    const integrity = analyzeIntegrity(current);
    const wasAltered = integrity.altered;
    const now = new Date();
    let nextStatus: ExperienceStatus = current.status;
    let extraData: {
      flaggedAt?: Date | null;
      flagReason?: string | null;
      revokedAt?: Date | null;
    } = {};

    if (input.action === "flag") {
      if (current.status === "flagged") {
        throw new ApiError(409, "ALREADY_FLAGGED", "This record is already flagged.");
      }
      if (current.status === "revoked") {
        throw new ApiError(
          409,
          "RECORD_REVOKED",
          "Restore the record before flagging it.",
        );
      }
      nextStatus = "flagged";
      extraData = { flaggedAt: now, flagReason: input.reason };
    } else if (input.action === "unflag") {
      if (current.status !== "flagged") {
        throw new ApiError(409, "NOT_FLAGGED", "This record is not flagged.");
      }
      nextStatus = restoredStatus(current);
      extraData = { flaggedAt: null, flagReason: null };
    } else if (input.action === "revoke") {
      if (current.status === "revoked") {
        throw new ApiError(409, "ALREADY_REVOKED", "This record is already revoked.");
      }
      nextStatus = "revoked";
      extraData = { revokedAt: now };
    } else {
      if (current.status !== "revoked") {
        throw new ApiError(409, "NOT_REVOKED", "This record is not revoked.");
      }
      nextStatus = restoredStatus(current);
      extraData = { revokedAt: null };
    }

    await tx.experience.update({
      where: { id: current.id },
      data: { status: nextStatus, ...extraData },
    });

    // If content has already been altered, changing status must not silently
    // re-seal the record. Status is not part of the signed payload, so the
    // altered warning remains visible after the administrative action.
    if (!wasAltered) {
      const eventType =
        input.action === "flag"
          ? "flagged"
          : input.action === "revoke"
            ? "revoked"
            : "restored";
      await appendEvidenceEvent(tx, {
        experienceId: current.id,
        type: eventType,
        actorId: input.actor.id,
        payload: {
          adminAction: input.action,
          priorStatus: current.status,
        },
      });
      await sealExperience(tx, current.id);
    }

    await tx.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorName: input.actor.name,
        action: input.action as AuditAction,
        targetType: "experience",
        targetId: current.id,
        reason: input.reason,
        metadata: {
          priorStatus: current.status,
          nextStatus,
          integrityAlteredBeforeAction: wasAltered,
          resealed: !wasAltered,
        },
      },
    });

    return {
      status: nextStatus,
      integrityAltered:
        wasAltered || analyzeIntegrity(
          await requireFullExperience(tx, current.id),
        ).altered,
    };
  });
}
