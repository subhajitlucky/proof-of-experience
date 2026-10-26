import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttestationForm } from "@/components/attestation-form";
import { DemoBadge } from "@/components/demo-badge";
import { TrustSeal } from "@/components/trust";
import {
  categoryLabel,
  formatDateRange,
  formatDateTime,
  shortHash,
} from "@/lib/format";
import { getInvitation } from "@/lib/services/witnesses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Witness a claim",
  robots: { index: false, follow: false, nocache: true },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function AttestPage({ params }: PageProps) {
  const { token } = await params;
  const invitation = await getInvitation(token);

  if (invitation.state === "not_found") notFound();

  if (invitation.state === "expired") {
    return (
      <div className="attest-main wrap">
        <div className="attest-card panel">
          <div className="panel__body py-12 text-center">
            <p className="eyebrow eyebrow--accent">Link expired</p>
            <h1 className="mt-4 font-display text-[42px] leading-none">
              This invitation has expired.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
              Ask the creator to issue a new witness invitation for the record
              &ldquo;{invitation.recordTitle}&rdquo;. Invitation links are valid for
              seven days and only once.
            </p>
            <Link className="btn btn--outline mt-7" href="/">
              Return home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (invitation.state === "used") {
    return (
      <div className="attest-main wrap">
        <div className="attest-card">
          <div className="flex flex-col items-center border border-rule bg-paper-raised px-5 py-12 text-center">
            <TrustSeal label="Witnessed" level="witness_verified" size="attestation" />
            <p className="eyebrow eyebrow--accent mt-8">Attestation recorded</p>
            <h1 className="mt-3 font-display text-[42px] leading-none">
              This link has already been used.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
              Your signature was recorded on{" "}
              {formatDateTime(invitation.attestedAt)} for the record &ldquo;
              {invitation.recordTitle}&rdquo;.
            </p>
            <blockquote className="claim-pull mt-8 max-w-xl text-left">
              <p className="claim-pull__text text-[24px]">{invitation.claimText}</p>
            </blockquote>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {invitation.recordSlug ? (
                <Link
                  className="btn btn--primary"
                  href={`/verify/${invitation.recordSlug}`}
                >
                  View public record
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ) : null}
              <Link className="btn btn--outline" href="/">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="attest-main wrap">
      <article className="attest-card">
        <header>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow eyebrow--accent">Witness invitation</p>
            {invitation.record.isDemo ? <DemoBadge /> : null}
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(40px,6vw,68px)] leading-[0.98] tracking-[-0.04em]">
            Someone has asked you to witness a claim.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">
            Read the specific claim below. If you can honestly attest to it, confirm
            your name and relationship, then sign. Your email address will never be
            shown publicly.
          </p>
        </header>

        <div className="attest-context mt-10">
          <div>
            <p className="eyebrow">The record</p>
            <h2 className="mt-3 font-display text-[clamp(30px,4vw,45px)] leading-none">
              {invitation.record.title}
            </h2>
            <p className="mt-3 text-xs text-muted">
              By {invitation.record.creatorName} ·{" "}
              <span className="text-faint">
                @{invitation.record.creatorHandle}
              </span>
            </p>
            <p className="mt-4 max-w-xl text-[12px] leading-6 text-muted">
              {invitation.record.summary}
            </p>
          </div>
          <dl className="inline-dl self-end">
            <div>
              <dt>Category</dt>
              <dd>{categoryLabel(invitation.record.category)}</dd>
            </div>
            <div>
              <dt>Approx. location</dt>
              <dd>{invitation.record.locationName}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>
                {formatDateRange(
                  invitation.record.startAt,
                  invitation.record.endAt,
                )}
              </dd>
            </div>
            <div>
              <dt>Record hash</dt>
              <dd className="hash--short">
                {shortHash(invitation.record.recordHash, 10)}
              </dd>
            </div>
          </dl>
        </div>

        <section className="mt-10" aria-labelledby="claim-heading">
          <p className="eyebrow">The claim you are asked to attest</p>
          <blockquote className="claim-pull mt-4">
            <p id="claim-heading" className="claim-pull__text">
              {invitation.claim.text}
            </p>
          </blockquote>
          {invitation.claim.evidence ? (
            <p className="mt-5 max-w-2xl border-t border-rule pt-4 text-[12px] leading-6 text-muted">
              <span className="eyebrow mr-2">Evidence supplied by creator</span>
              {invitation.claim.evidence}
            </p>
          ) : null}
        </section>

        {invitation.record.integrityAltered ? (
          <div className="mt-8 border border-accent bg-accent-wash p-5 text-sm text-accent-deep">
            <p className="font-semibold">This record currently fails its integrity check.</p>
            <p className="mt-1 leading-6">
              Do not sign. Ask the creator to resolve the record before sending a new
              invitation.
            </p>
          </div>
        ) : null}

        <div className="mt-11 border-t border-rule pt-9">
          <AttestationForm
            token={token}
            invitedName={invitation.invitedName}
            altered={invitation.record.integrityAltered}
            expiresAt={invitation.expiresAt}
          />
        </div>

        <footer className="mt-10 flex flex-wrap items-start justify-between gap-5 border-t border-rule pt-5 text-[10px] leading-5 text-faint">
          <p className="max-w-xl">
            An attestation records that you signed a specific claim against a record
            hash. It is evidence, not a legal signature, and it does not ask you to
            vouch for anything beyond the claim shown.
          </p>
          <p>Link expires after seven days · single use.</p>
        </footer>
      </article>
    </div>
  );
}
