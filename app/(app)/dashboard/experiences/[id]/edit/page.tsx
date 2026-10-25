import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditExperienceForm } from "@/components/edit-experience-form";
import { prisma } from "@/lib/db";
import { decryptNumber } from "@/lib/crypto";
import { requireUser } from "@/lib/session";
import { findFullExperience } from "@/lib/services/records";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit draft",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function utcInput(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export default async function EditExperiencePage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const experience = await findFullExperience(prisma, id);
  if (!experience || experience.creatorId !== user.id) notFound();

  if (
    experience.status !== "draft" ||
    experience.recordHash ||
    experience.witnesses.length > 0
  ) {
    redirect(`/dashboard/experiences/${experience.id}`);
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    if (experience.latitudeEnc) latitude = decryptNumber(experience.latitudeEnc);
    if (experience.longitudeEnc) longitude = decryptNumber(experience.longitudeEnc);
  } catch {
    latitude = null;
    longitude = null;
  }

  return (
    <div className="wrap-wide">
      <header className="page-head">
        <Link
          className="back-link"
          href={`/dashboard/experiences/${experience.id}`}
        >
          <span aria-hidden="true">←</span> Back to record
        </Link>
        <p className="eyebrow eyebrow--accent mt-7">Draft edit</p>
        <h1 className="page-title">Revise before it is sealed.</h1>
        <p className="page-intro">
          Drafts can be edited until a witness is invited or the record is published.
          At that point the canonical content is sealed and becomes immutable.
        </p>
      </header>

      <EditExperienceForm
        experience={{
          id: experience.id,
          title: experience.title,
          summary: experience.summary,
          category: experience.category,
          locationName: experience.locationName,
          startAtLocal: utcInput(experience.startAt),
          endAtLocal: utcInput(experience.endAt),
          visibility: experience.visibility,
          showExactLocation: experience.showExactLocation,
          latitude,
          longitude,
          claims: experience.claims.map((claim) => ({
            key: claim.id,
            text: claim.text,
            evidence: claim.evidence ?? "",
          })),
          participants: experience.participants.map((participant) => ({
            key: participant.id,
            name: participant.name,
            role: participant.role,
            email: participant.email ?? "",
          })),
        }}
      />
    </div>
  );
}
