import type { Metadata } from "next";
import Link from "next/link";
import { DemoBadge } from "@/components/demo-badge";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/session";
import { getUserExperiences } from "@/lib/services/experiences";
import {
  categoryLabel,
  formatShortDate,
  trustLabel,
  visibilityLabel,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Record book",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await requireUser();
  const experiences = await getUserExperiences(user.id);

  const stats = {
    total: experiences.length,
    published: experiences.filter((record) => record.status === "published").length,
    attestations: experiences.reduce(
      (total, record) => total + record._count.attestations,
      0,
    ),
    draft: experiences.filter(
      (record) =>
        record.status === "draft" ||
        record.status === "evidence_pending" ||
        record.status === "witness_verified",
    ).length,
  };

  return (
    <div className="wrap-wide">
      <header className="dash-head">
        <div>
          <p className="eyebrow eyebrow--accent">Creator workbench</p>
          <h1 className="dash-title">Your record book.</h1>
          <p className="dash-intro">
            Evidence, witnesses and publication state for every experience. Drafts
            stay private until you publish them.
          </p>
        </div>
        <Link className="btn btn--primary" href="/dashboard/new">
          New experience
          <span className="btn__arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </header>

      <div className="stat-row">
        {[
          ["Records", stats.total],
          ["Published", stats.published],
          ["Witness signatures", stats.attestations],
          ["In preparation", stats.draft],
        ].map(([label, value]) => (
          <div className="stat" key={String(label)}>
            <span className="stat__number">{value}</span>
            <span className="stat__label">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <p className="eyebrow">All records</p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-faint">
          Trust criteria are always visible · no hidden score
        </p>
      </div>

      {experiences.length === 0 ? (
        <div className="empty-state mt-4">
          <p className="eyebrow">A blank archive</p>
          <h2 className="mt-4 font-display text-[34px] leading-none">
            Your first record starts with one claim.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
            Add the experience, the evidence you can stand behind, and the people
            who can corroborate a specific claim. You can keep it as a draft for as
            long as you need.
          </p>
          <Link className="btn btn--primary mt-6" href="/dashboard/new">
            Create a record
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      ) : (
        <div className="mt-3">
          <div className="ledger__header">
            <span>Record</span>
            <span>Status</span>
            <span>Trust</span>
            <span>Witnesses</span>
            <span className="text-right">Open</span>
          </div>
          <ul className="ledger">
            {experiences.map((record) => {
              const publiclyViewable =
                record.visibility !== "private" &&
                record.publishedAt &&
                ["published", "flagged", "revoked"].includes(record.status);
              return (
                <li className="ledger__row" key={record.id}>
                  <div className="ledger__main">
                    <Link
                      className="ledger__title"
                      href={`/dashboard/experiences/${record.id}`}
                    >
                      {record.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="ledger__meta">
                        {categoryLabel(record.category)} ·{" "}
                        {visibilityLabel(record.visibility)}
                      </span>
                      {record.isDemo ? <DemoBadge /> : null}
                    </div>
                  </div>
                  <div className="ledger__cell">
                    <span className="ledger__cell-label">Status</span>
                    <StatusPill status={record.status} />
                  </div>
                  <div className="ledger__cell">
                    <span className="ledger__cell-label">Trust</span>
                    <span className="text-[11px] text-muted">
                      {trustLabel(record.trustLevel)}
                    </span>
                  </div>
                  <div className="ledger__cell">
                    <span className="ledger__cell-label">Witnesses</span>
                    <span className="text-[11px] text-muted">
                      {record._count.attestations} signed /{" "}
                      {record._count.witnesses} invited
                    </span>
                  </div>
                  <div className="ledger__action flex flex-col items-end gap-1.5">
                    <Link
                      className="textlink"
                      href={`/dashboard/experiences/${record.id}`}
                    >
                      Open
                    </Link>
                    {publiclyViewable ? (
                      <Link
                        className="text-[10px] text-faint underline decoration-rule underline-offset-4 hover:text-accent"
                        href={`/verify/${record.slug}`}
                      >
                        Public page
                      </Link>
                    ) : null}
                    <span className="text-[9px] text-faint">
                      {formatShortDate(record.updatedAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-8 max-w-2xl text-[11px] leading-5 text-faint">
        A sealed record cannot be edited through the creator interface. To change
        substantive content, create a new record. Direct data changes make the public
        page show an integrity alert.
      </p>
    </div>
  );
}
