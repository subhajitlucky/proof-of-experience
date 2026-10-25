import type { Metadata } from "next";
import Link from "next/link";
import { NewExperienceForm } from "@/components/new-experience-form";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New experience",
  robots: { index: false, follow: false },
};

export default async function NewExperiencePage() {
  await requireUser();
  return (
    <div className="wrap-wide">
      <header className="page-head">
        <Link className="back-link" href="/dashboard">
          <span aria-hidden="true">←</span> Record book
        </Link>
        <p className="eyebrow eyebrow--accent mt-7">New record</p>
        <h1 className="page-title">Begin with what happened.</h1>
        <p className="page-intro">
          Build a draft from specifics: what was made or done, when and where, which
          files exist, and who can vouch for a particular claim. Evidence is hashed as
          you add it.
        </p>
      </header>
      <NewExperienceForm />
    </div>
  );
}
