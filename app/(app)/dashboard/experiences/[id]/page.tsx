import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddEvidenceButtons } from "@/components/add-evidence-buttons";
import { CopyButton } from "@/components/copy-button";
import { DemoBadge } from "@/components/demo-badge";
import { DraftMediaUploader } from "@/components/draft-media-uploader";
import { EvidenceTimeline } from "@/components/evidence-timeline";
import { InviteWitnessForm } from "@/components/invite-witness-form";
import { RecordActions } from "@/components/record-actions";
import { StatusPill } from "@/components/status-pill";
import { TrustCriteria, TrustSeal } from "@/components/trust";
import { VisibilityControl } from "@/components/visibility-control";
import { prisma } from "@/lib/db";
import {
  absoluteUrl,
  categoryLabel,
  formatDateRange,
  formatDateTime,
  formatFileSize,
  trustLabel,
  visibilityLabel,
} from "@/lib/format";
import { requireUser } from "@/lib/session";
import { findFullExperience } from "@/lib/services/records";
import {
  analyzeIntegrity,
  calculateExperienceTrust,
  isPubliclyVisible,
} from "@/lib/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experience record",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

function witnessState(witness: {
  usedAt: Date | null;
  tokenExpiresAt: Date;
}): "signed" | "expired" | "pending" {
  if (witness.usedAt) return "signed";
  if (witness.tokenExpiresAt <= new Date()) return "expired";
  return "pending";
}

export default async function ExperienceDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;
  const experience = await findFullExperience(prisma, id);
  if (!experience || experience.creatorId !== user.id) notFound();

  const integrity = analyzeIntegrity(experience);
  const trust = calculateExperienceTrust(experience);
  const publiclyViewable = isPubliclyVisible(experience);
  const canEdit =
    experience.status === "draft" &&
    !experience.recordHash &&
    experience.witnesses.length === 0;
  const locked = experience.status === "flagged" || experience.status === "revoked";
  const verifyUrl = absoluteUrl(`/verify/${experience.slug}`);
  const badgeUrl = absoluteUrl(`/api/badge/${experience.slug}`);
  const embedSnippet = `<a href="${verifyUrl}"><img src="${badgeUrl}" alt="Proof of Experience verification badge" width="480" height="150"></a>`;
  const claimById = new Map(experience.claims.map((claim) => [claim.id, claim]));
  const signedWitnesses = experience.witnesses.filter(
    (witness) => witness.usedAt,
  ).length;

  return (
    <div className="wrap-wide">
      <div className="page-head">
        <Link className="back-link" href="/dashboard">
          <span aria-hidden="true">←</span> Record book
        </Link>
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <StatusPill status={experience.status} altered={integrity.altered} />
          <span className="pill">{trustLabel(trust.level)}</span>
          <span className="pill">{categoryLabel(experience.category)}</span>
          <span className="pill">{visibilityLabel(experience.visibility)}</span>
          {experience.isDemo ? <DemoBadge /> : null}
        </div>
        <h1 className="page-title">{experience.title}</h1>
        <p className="page-intro">{experience.summary}</p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-4 text-[11px] text-muted">
          <span>
            <span className="eyebrow mr-2">Place</span>
            {experience.locationName}
          </span>
          <span>
            <span className="eyebrow mr-2">Dates</span>
            {formatDateRange(experience.startAt, experience.endAt)}
          </span>
          <span>
            <span className="eyebrow mr-2">Updated</span>
            {formatDateTime(experience.updatedAt)}
          </span>
        </div>
      </div>

      {experience.isDemo ? (
        <div className="demo-banner mb-8" role="note">
          <strong>Demo record.</strong> This creator, record and all witness
          identities are fictional. Public data is labelled to prevent confusion.
        </div>
      ) : null}

      {experience.status === "flagged" ? (
        <div className="status-banner status-banner--warning mb-8">
          <div>
            <p className="eyebrow eyebrow--accent">Registry hold</p>
            <h2 className="status-banner__title">This record is flagged.</h2>
            <p className="status-banner__copy">
              Only an administrator can remove the flag. Existing creator actions
              that change the record are disabled.
              {experience.flagReason ? ` Reason: ${experience.flagReason}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {experience.status === "revoked" ? (
        <div className="status-banner status-banner--danger mb-8">
          <div>
            <p className="eyebrow">Revoked</p>
            <h2 className="status-banner__title">This record is revoked.</h2>
            <p className="status-banner__copy">
              {experience.revokedAt
                ? `Revoked on ${formatDateTime(experience.revokedAt)}. `
                : ""}
              Its prior evidence may remain publicly visible, but it cannot receive
              new evidence or witness signatures.
            </p>
          </div>
        </div>
      ) : null}

      {integrity.altered ? (
        <div className="status-banner status-banner--danger mb-8" role="alert">
          <div>
            <p className="eyebrow">Integrity alert</p>
            <h2 className="status-banner__title">Record altered after signing</h2>
            <p className="status-banner__copy">
              The current record no longer matches its sealed hash. Verified badges
              are suspended. The application will not re-seal this record. Create a
              new record if the content needs correction.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-9 border-y border-rule py-4">
        <RecordActions
          experienceId={experience.id}
          status={experience.status}
          visibility={experience.visibility}
          altered={integrity.altered}
          canEdit={canEdit}
          publicPath={`/verify/${experience.slug}`}
          publiclyViewable={Boolean(publiclyViewable)}
        />
      </div>

      <div className="owner-grid">
        <div className="min-w-0 space-y-9">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Evidence</p>
                <h2 className="mt-1 font-display text-[28px] leading-none">
                  Timeline
                </h2>
              </div>
              <span className="text-[10px] text-faint">
                {experience.evidenceEvents.length} chained events
              </span>
            </div>
            <div className="panel__body">
              <EvidenceTimeline
                events={experience.evidenceEvents.map((event) => ({
                  type: event.type,
                  occurredAt: event.occurredAt.toISOString(),
                  sequence: event.sequence,
                  eventHash: event.eventHash,
                  previousHash: event.previousHash,
                }))}
                showHashes
              />
            </div>
          </section>

          <section className="border-t border-rule pt-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Claims</p>
                <h2 className="mt-2 font-display text-[36px] leading-none">
                  What the record asserts
                </h2>
              </div>
              {canEdit ? (
                <Link
                  className="textlink"
                  href={`/dashboard/experiences/${experience.id}/edit`}
                >
                  Edit claims
                </Link>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.1em] text-faint">
                  Sealed content is immutable
                </span>
              )}
            </div>
            <div className="mt-6">
              {experience.claims.map((claim) => {
                const claimWitnesses = experience.attestations.filter(
                  (attestation) => attestation.claimId === claim.id,
                );
                return (
                  <article className="claim" key={claim.id}>
                    <div className="claim__head">
                      <span className="claim__number">
                        {String(claim.position).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="claim__text">{claim.text}</p>
                        {claim.evidence ? (
                          <p className="claim__evidence">
                            <span className="eyebrow mr-2">Evidence note</span>
                            {claim.evidence}
                          </p>
                        ) : null}
                        <div className="witness-note">
                          <strong>
                            {claimWitnesses.length} witness
                            {claimWitnesses.length === 1 ? "" : "es"}
                          </strong>
                          <span aria-hidden="true">·</span>
                          {claimWitnesses.length > 0 ? (
                            <span>
                              {claimWitnesses
                                .map(
                                  (attestation) =>
                                    attestation.witness.invitedName,
                                )
                                .join(", ")}
                            </span>
                          ) : (
                            <span>No signatures on this claim yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="border-t border-rule pt-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Media</p>
                <h2 className="mt-2 font-display text-[36px] leading-none">
                  Files and hashes
                </h2>
              </div>
              <span className="text-[10px] text-faint">
                {experience.media.length} file
                {experience.media.length === 1 ? "" : "s"}
              </span>
            </div>
            {experience.media.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {experience.media.map((asset) => (
                  <div className="border border-rule bg-paper-raised" key={asset.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/media/${asset.id}`}
                      alt={`Evidence for ${experience.title}`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="space-y-1 border-t border-rule p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                          {asset.isCover ? "Cover" : "Media"} ·{" "}
                          {formatFileSize(asset.size)}
                        </span>
                        <span className="text-[9px] text-faint">
                          {asset.gpsPresent ? "EXIF GPS present" : "No EXIF GPS"}
                        </span>
                      </div>
                      <p className="hash">{asset.sha256}</p>
                      <p className="text-[10px] text-faint">
                        Captured{" "}
                        {asset.capturedAt
                          ? formatDateTime(asset.capturedAt)
                          : "time not recorded"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 border border-rule bg-paper-raised p-4 text-sm text-muted">
                No media has been added. Drafts can include images; signed records
                cannot be modified.
              </p>
            )}
            {canEdit ? (
              <DraftMediaUploader
                experienceId={experience.id}
                currentCount={experience.media.length}
              />
            ) : null}
          </section>

          <section className="border-t border-rule pt-7">
            <div>
              <p className="eyebrow">People</p>
              <h2 className="mt-2 font-display text-[36px] leading-none">
                Participants
              </h2>
            </div>
            {experience.participants.length > 0 ? (
              <ul className="mt-4 border-t border-rule">
                {experience.participants.map((participant) => (
                  <li
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-3"
                    key={participant.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">{participant.name}</p>
                      <p className="text-[11px] text-muted">{participant.role}</p>
                    </div>
                    <p className="text-[10px] text-faint">
                      {participant.email ?? "No email provided"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No participants recorded.</p>
            )}
          </section>

          <section className="border-t border-rule pt-7">
            <p className="eyebrow">Record seal</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="hash max-w-full">{experience.recordHash ?? "Not sealed yet"}</p>
              {experience.recordHash ? (
                <CopyButton
                  value={experience.recordHash}
                  label="Copy hash"
                  copiedLabel="Copied"
                  className="btn btn--outline btn--sm"
                />
              ) : null}
            </div>
            <p className="mt-3 max-w-2xl text-[11px] leading-5 text-faint">
              {experience.recordHash
                ? `Sealed ${formatDateTime(
                    experience.signedAt ?? experience.updatedAt,
                  )} · version ${experience.sealedVersion}. Any direct change to the content is detected at verification.`
                : "This draft is unsigned. It will be sealed with Ed25519 when you invite a witness or publish."}
            </p>
            {experience.signature ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] text-muted">
                  Signature and public key
                </summary>
                <p className="hash mt-2">{experience.signature}</p>
                <p className="hash mt-2 text-faint">{experience.publicKey}</p>
              </details>
            ) : null}
          </section>
        </div>

        <aside className="owner-aside">
          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Trust level</p>
              <span className="text-[10px] text-faint">{trustLabel(trust.level)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[27px] leading-none">{trust.label}</p>
                <p className="mt-2 text-[11px] leading-5 text-faint">
                  {integrity.altered
                    ? "Badge suspended. Record no longer matches its seal."
                    : "Criteria are shown, not collapsed into a score."}
                </p>
              </div>
              {!integrity.altered ? (
                <TrustSeal level={trust.level} label={trust.label} ink />
              ) : null}
            </div>
            <div className="mt-4 border-t border-rule pt-2">
              <TrustCriteria trust={trust} />
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Witnesses</p>
              <span className="text-[10px] text-faint">
                {signedWitnesses} signed
              </span>
            </div>
            <p className="text-[12px] leading-6 text-muted">
              Two independent signed witnesses are required for witness-verified
              status. All witnesses must use different private email addresses.
            </p>
            <div className="mt-4 space-y-0 border-t border-rule">
              {experience.witnesses.length === 0 ? (
                <p className="py-3 text-[12px] text-faint">No invitations yet.</p>
              ) : (
                experience.witnesses.map((witness) => {
                  const state = witnessState(witness);
                  const claim = claimById.get(witness.claimId);
                  return (
                    <div
                      className="border-b border-rule py-3 last:border-b-0"
                      key={witness.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-semibold">
                            {witness.invitedName}
                          </p>
                          <p className="text-[10px] text-faint">{witness.email}</p>
                        </div>
                        <span
                          className={`status-pill ${
                            state === "signed"
                              ? "status-pill--good"
                              : state === "expired"
                                ? "status-pill--danger"
                                : "status-pill--muted"
                          }`}
                        >
                          {state}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-faint">
                        Claim{" "}
                        {claim
                          ? `${String(claim.position).padStart(2, "0")} · ${claim.text.slice(0, 75)}${claim.text.length > 75 ? "…" : ""}`
                          : "unknown"}
                      </p>
                      <p className="mt-1 text-[9px] text-faint">
                        Expires {formatDateTime(witness.tokenExpiresAt)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 border-t border-rule pt-4">
              <InviteWitnessForm
                experienceId={experience.id}
                claims={experience.claims.map((claim) => ({
                  id: claim.id,
                  position: claim.position,
                  text: claim.text,
                }))}
                locked={locked}
                altered={integrity.altered}
              />
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Capture context</p>
            </div>
            <dl className="inline-dl">
              <div>
                <dt>Location event</dt>
                <dd>
                  {experience.locationConfirmedAt
                    ? formatDateTime(experience.locationConfirmedAt)
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Device context</dt>
                <dd>
                  {experience.deviceAttestedAt
                    ? formatDateTime(experience.deviceAttestedAt)
                    : "Not recorded"}
                </dd>
              </div>
            </dl>
            {!locked && !experience.locationConfirmedAt ? (
              <p className="mt-3 text-[11px] leading-5 text-muted">
                Confirm the location and timeframe to satisfy that criterion.
              </p>
            ) : null}
            {!locked && !experience.deviceAttestedAt ? (
              <p className="mt-2 text-[11px] leading-5 text-muted">
                No camera metadata was found. You can record a creator device
                confirmation; it remains self-declared.
              </p>
            ) : null}
            <div className="mt-3">
              <AddEvidenceButtons
                experienceId={experience.id}
                missingLocation={!experience.locationConfirmedAt}
                missingDevice={!experience.deviceAttestedAt}
                disabled={locked || integrity.altered}
              />
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Publication</p>
              <span className="text-[10px] text-faint">
                {publiclyViewable ? "Live" : "Not public"}
              </span>
            </div>
            <dl className="inline-dl">
              <div>
                <dt>Status</dt>
                <dd>{experience.status.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Visibility</dt>
                <dd>{visibilityLabel(experience.visibility)}</dd>
              </div>
              <div>
                <dt>First published</dt>
                <dd>
                  {experience.publishedAt
                    ? formatDateTime(experience.publishedAt)
                    : "Not yet"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-rule pt-4">
              <VisibilityControl
                experienceId={experience.id}
                visibility={experience.visibility}
                disabled={locked || experience.status === "published"}
              />
            </div>
            {publiclyViewable ? (
              <div className="mt-4 border-t border-rule pt-4">
                <p className="eyebrow mb-2">Share</p>
                <div className="copy-field">
                  <input
                    className="field field--compact"
                    readOnly
                    value={verifyUrl}
                    aria-label="Public verification URL"
                  />
                  <CopyButton
                    value={verifyUrl}
                    label="Copy"
                    copiedLabel="Copied"
                    className="btn btn--outline btn--sm"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn btn--outline btn--sm" href={`/verify/${experience.slug}`}>
                    Open public page
                  </Link>
                  <a
                    className="btn btn--outline btn--sm"
                    href={`/api/verify/${experience.slug}?download=1`}
                    download
                  >
                    Download JSON
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11px] leading-5 text-faint">
                Public page and JSON become available after publishing a public or
                unlisted record.
              </p>
            )}
          </section>

          {publiclyViewable ? (
            <section className="provenance-box">
              <div className="provenance-box__head">
                <p className="eyebrow">Badge &amp; embed</p>
              </div>
              <div className="embed-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/badge/${experience.slug}`}
                  alt={`Badge for ${experience.title}`}
                  width={480}
                  height={150}
                />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] font-semibold text-muted">
                  Embed snippet
                </summary>
                <pre className="embed-code mt-2">{embedSnippet}</pre>
                <div className="mt-2">
                  <CopyButton
                    value={embedSnippet}
                    label="Copy embed code"
                    className="btn btn--outline btn--sm"
                  />
                </div>
              </details>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
