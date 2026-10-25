import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { DemoBadge } from "@/components/demo-badge";
import { EvidenceTimeline } from "@/components/evidence-timeline";
import { Avatar } from "@/components/identity";
import { StatusPill } from "@/components/status-pill";
import { TrustCriteria, TrustSeal } from "@/components/trust";
import {
  absoluteUrl,
  categoryLabel,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatFileSize,
  shortHash,
} from "@/lib/format";
import { generateQrDataUrl } from "@/lib/qr";
import { getPublicVerification } from "@/lib/services/public-verification";
import type { VerificationDocument } from "@/lib/verification";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const view = await getPublicVerification(slug);
  if (!view) {
    return {
      title: "Record not found",
      robots: { index: false, follow: false },
    };
  }
  const { document } = view;
  const noindex =
    document.integrity.altered ||
    document.record.status === "flagged" ||
    document.record.status === "revoked";
  return {
    title: `${document.record.title} — Public record`,
    description: document.record.summary.slice(0, 180),
    alternates: { canonical: `/verify/${document.record.slug}` },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: document.record.title,
      description: document.record.summary.slice(0, 180),
      type: "article",
    },
  };
}

interface BannerInfo {
  tone: "good" | "warning" | "danger" | "pending";
  label: string;
  title: string;
  copy: string;
}

function bannerFor(document: VerificationDocument): BannerInfo {
  if (document.integrity.altered) {
    return {
      tone: "danger",
      label: "Integrity alert",
      title: "Record altered after signing",
      copy: "The current record content no longer matches the sealed record hash. Verified badges are disabled. The record remains visible so the alteration can be inspected.",
    };
  }
  if (document.record.status === "revoked") {
    return {
      tone: "danger",
      label: "Revoked",
      title: "This record has been revoked",
      copy: "The creator or registry revoked this record. Its prior evidence remains visible so the revocation and the original seal can be inspected.",
    };
  }
  if (document.record.status === "flagged") {
    return {
      tone: "warning",
      label: "Under review",
      title: "This record is flagged for review",
      copy: "The registry has placed this record under review. The record's integrity state is shown separately and its evidence remains available for inspection.",
    };
  }
  if (
    document.trust.level === "witness_verified" ||
    document.trust.level === "fully_verified"
  ) {
    return {
      tone: "good",
      label: "Seal verified",
      title: "Record integrity verified",
      copy: `The record content, evidence chain and witness signatures match the sealed record hash. ${document.trust.witnessCount} independent witness${
        document.trust.witnessCount === 1 ? "" : "es"
      } attested. Integrity is not a judgment of truth.`,
    };
  }
  return {
    tone: "pending",
    label: "Evidence pending",
    title: "Published. More evidence pending.",
    copy: "The seal is intact, but this record has not met the witness-verified criteria. Read the evidence and the trust criteria below.",
  };
}

export default async function VerifyPage({ params }: PageProps) {
  const { slug } = await params;
  const view = await getPublicVerification(slug);
  if (!view) notFound();

  const { document, coverPublicUrl, exactCoordinates } = view;
  const banner = bannerFor(document);
  const verifyUrl = absoluteUrl(`/verify/${document.record.slug}`);
  const badgeUrl = absoluteUrl(`/api/badge/${document.record.slug}`);
  const jsonUrl = `/api/verify/${document.record.slug}?download=1`;
  const qrDataUrl = await generateQrDataUrl(verifyUrl);
  const badgeSnippet = `<a href="${verifyUrl}"><img src="${badgeUrl}" alt="Proof of Experience verification badge" width="480" height="150"></a>`;
  const coverAsset = document.media.find((asset) => asset.isCover) ?? document.media[0];
  const attestationsByClaim = new Map<string, typeof document.attestations>();
  for (const attestation of document.attestations) {
    const list = attestationsByClaim.get(attestation.claimId) ?? [];
    list.push(attestation);
    attestationsByClaim.set(attestation.claimId, list);
  }

  return (
    <article className="public-record wrap">
      <div className="public-record__top">
        <div className="flex flex-wrap items-center gap-3">
          <span className="eyebrow">Public verification</span>
          <span className="text-[10px] text-faint">·</span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-faint">
            Record {document.record.slug}
          </span>
          {document.record.isDemo ? <DemoBadge /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            status={document.record.status}
            altered={document.integrity.altered}
          />
          <span className="text-[10px] uppercase tracking-[0.1em] text-faint">
            {document.record.visibility}
          </span>
        </div>
      </div>

      {document.record.isDemo ? (
        <div className="demo-banner" role="note">
          <strong>Demo record.</strong> Every person, witness, image and event in
          this record is fictional and included for product evaluation.
        </div>
      ) : null}

      <header className="public-record__header">
        <div>
          <p className="eyebrow eyebrow--accent">
            {categoryLabel(document.record.category)} · {document.record.location}
          </p>
          <h1 className="public-record__title">{document.record.title}</h1>
          <p className="public-record__summary">{document.record.summary}</p>
          <div className="public-record__byline">
            <Avatar
              name={document.record.creator.name}
              src={document.record.creator.avatarUrl}
              large
            />
            <div>
              <p className="text-[13px] font-semibold">
                {document.record.creator.name}
              </p>
              <p className="text-[11px] text-faint">
                @{document.record.creator.handle}
              </p>
            </div>
            <span className="hidden h-8 w-px bg-rule sm:block" aria-hidden="true" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.11em] text-faint">
                Recorded
              </p>
              <p className="text-[12px] text-ink-soft">
                {formatDateRange(document.record.startAt, document.record.endAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="public-record__seal">
          {!document.integrity.altered ? (
            <TrustSeal level={document.trust.level} label={document.trust.label} />
          ) : (
            <div className="seal-suspended">
              <span className="eyebrow eyebrow--accent">Seal suspended</span>
              <strong>Altered after signing</strong>
            </div>
          )}
          <p className="mt-3 text-center text-[9px] uppercase tracking-[0.12em] text-faint">
            {formatDate(document.record.publishedAt ?? document.record.createdAt)}
          </p>
        </div>
      </header>

      <section
        className={`status-banner status-banner--${banner.tone}`}
        aria-labelledby="integrity-banner-title"
      >
        <div>
          <p className="eyebrow eyebrow--accent">{banner.label}</p>
          <h2 className="status-banner__title" id="integrity-banner-title">
            {banner.title}
          </h2>
          <p className="status-banner__copy">{banner.copy}</p>
        </div>
        <Link className="btn btn--outline no-print" href="#evidence">
          Read the evidence
          <span aria-hidden="true">↓</span>
        </Link>
      </section>

      <div className="verify-grid">
        <div className="verify-main">
          {coverPublicUrl ? (
            <figure className="record-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPublicUrl}
                alt={`Cover evidence for ${document.record.title}`}
              />
              <figcaption>
                <span>Cover image</span>
                <span>
                  {coverAsset?.capturedAt
                    ? formatDateTime(coverAsset.capturedAt)
                    : "Capture time not recorded"}
                </span>
              </figcaption>
            </figure>
          ) : null}

          <section className="record-section" aria-labelledby="claims-heading">
            <div className="record-section__head">
              <div>
                <p className="eyebrow">Claims &amp; attestations</p>
                <h2 id="claims-heading">What is being asserted</h2>
              </div>
              <span className="text-[11px] text-faint">
                {document.claims.length} claim{document.claims.length === 1 ? "" : "s"}
              </span>
            </div>
            <div>
              {document.claims.map((claim) => {
                const witnessAttestations = attestationsByClaim.get(claim.id) ?? [];
                return (
                  <article className="claim" key={claim.id}>
                    <div className="claim__head">
                      <span className="claim__number">
                        {String(claim.position).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="claim__text">{claim.text}</p>
                        {claim.evidence ? (
                          <p className="claim__evidence">
                            <span className="eyebrow mr-2">Evidence on file</span>
                            {claim.evidence}
                          </p>
                        ) : null}
                        <div className="witness-note">
                          <strong>
                            {claim.witnessCount} independent witness
                            {claim.witnessCount === 1 ? "" : "es"}
                          </strong>
                          <span aria-hidden="true">·</span>
                          <span>
                            {witnessAttestations.length > 0
                              ? witnessAttestations
                                  .map((attestation) => attestation.label)
                                  .join(", ")
                              : "No attestation on this claim"}
                          </span>
                        </div>
                        {witnessAttestations.length > 0 ? (
                          <div className="attestation-witness">
                            {witnessAttestations.map((attestation) => (
                              <p key={`${attestation.label}-${attestation.attestedAt}`}>
                                {attestation.label} · {attestation.relationship} ·{" "}
                                {formatDateTime(attestation.attestedAt)}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="record-section" aria-labelledby="people-heading">
            <div className="record-section__head">
              <div>
                <p className="eyebrow">People present</p>
                <h2 id="people-heading">Recorded participants</h2>
              </div>
            </div>
            {document.participants.length > 0 ? (
              <ul className="participants">
                {document.participants.map((participant) => (
                  <li key={`${participant.name}-${participant.role}`}>
                    <span>{participant.name}</span>
                    <span>{participant.role}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No additional participants recorded.</p>
            )}
          </section>

          <section className="record-section" id="evidence" aria-labelledby="evidence-heading">
            <div className="record-section__head">
              <div>
                <p className="eyebrow">Evidence timeline</p>
                <h2 id="evidence-heading">What happened, in order</h2>
              </div>
              <span className="text-[11px] text-faint">
                {document.evidenceEvents.length} chained events
              </span>
            </div>
            <EvidenceTimeline events={document.evidenceEvents} showHashes />
            <div className="mt-6 border-t border-rule pt-4">
              <p className="text-[11px] leading-5 text-faint">
                Every event commits to the previous event hash. Later events cannot
                be quietly inserted into this sequence; the chain is checked on every
                verification.
              </p>
            </div>
          </section>

          <section className="record-section" aria-labelledby="media-heading">
            <div className="record-section__head">
              <div>
                <p className="eyebrow">File evidence</p>
                <h2 id="media-heading">Media fingerprints</h2>
              </div>
              <span className="text-[11px] text-faint">
                {document.media.length} file{document.media.length === 1 ? "" : "s"}
              </span>
            </div>
            {document.media.length > 0 ? (
              <ul className="media-evidence">
                {document.media.map((asset, index) => (
                  <li key={asset.sha256}>
                    <div className="media-evidence__top">
                      <span className="eyebrow">
                        File {String(index + 1).padStart(2, "0")}
                        {asset.isCover ? " · cover" : ""}
                      </span>
                      <span className="text-[10px] text-faint">
                        {asset.mimeType} · {formatFileSize(asset.size)} ·{" "}
                        {asset.gpsPresent ? "GPS present in EXIF" : "No EXIF GPS"}
                      </span>
                    </div>
                    <p className="hash mt-2">{asset.sha256}</p>
                    <p className="mt-1 text-[10px] text-faint">
                      Captured{" "}
                      {asset.capturedAt
                        ? formatDateTime(asset.capturedAt)
                        : "time not recorded"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No media in this record.</p>
            )}
          </section>

          <section className="record-section" aria-labelledby="attestation-note-heading">
            <div className="record-section__head">
              <div>
                <p className="eyebrow">Witness privacy</p>
                <h2 id="attestation-note-heading">Names withheld, signatures included</h2>
              </div>
            </div>
            <p className="max-w-2xl text-[13px] leading-6 text-muted">
              Witness names and email addresses are never included on this public
              page or in the verification JSON. Relationships are shown as context.
              The downloadable document includes each witness public key and
              signature so the attestation can be checked cryptographically.
            </p>
          </section>
        </div>

        <aside className="verify-aside" aria-label="Record trust and provenance">
          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Trust level</p>
              <span className="text-[10px] text-faint">No hidden score</span>
            </div>
            <div className="flex items-center gap-4 border-b border-rule pb-5">
              <span className="font-display text-[27px] leading-none">
                {document.trust.label}
              </span>
            </div>
            <div className="pt-2">
              <TrustCriteria trust={document.trust} />
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Record integrity</p>
              <span className="text-[10px] text-faint">Ed25519</span>
            </div>
            <dl className="integrity-checks">
              {(
                [
                  ["Record hash recomputed", document.integrity.checks.recordHashMatches],
                  ["Server signature valid", document.integrity.checks.signatureValid],
                  ["Trusted signer key", document.integrity.checks.trustedSigner],
                  ["Evidence chain intact", document.integrity.checks.evidenceChainValid],
                  [
                    "Witness signatures valid",
                    document.integrity.checks.attestationSignaturesValid,
                  ],
                ] as Array<[string, boolean]>
              ).map(([label, met]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd data-met={met}>{met ? "Pass" : "Fail"}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-rule pt-4">
              <p className="eyebrow mb-2">Record hash</p>
              <p className="hash">{document.integrity.recordHash ?? "Not sealed"}</p>
              <div className="mt-3 flex flex-wrap gap-2 no-print">
                <CopyButton
                  value={document.integrity.recordHash ?? ""}
                  label="Copy hash"
                  className="btn btn--outline btn--sm"
                />
                <a className="btn btn--outline btn--sm" href={jsonUrl} download>
                  Download JSON
                </a>
              </div>
              {document.integrity.signedAt ? (
                <p className="mt-3 text-[10px] text-faint">
                  Sealed {formatDateTime(document.integrity.signedAt)} · version{" "}
                  {document.integrity.sealedVersion}
                </p>
              ) : null}
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Share this record</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="qr-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code linking to the public verification page for ${document.record.title}`}
                  width={136}
                  height={136}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] leading-5 text-muted">
                  Scan to open this verification record. The URL points to the page
                  you are reading.
                </p>
                <a
                  className="textlink mt-3 inline-flex"
                  href={verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open canonical URL
                </a>
              </div>
            </div>
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Location</p>
            </div>
            <p className="font-display text-[23px] leading-tight">
              {document.record.location}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-faint">
              {exactCoordinates
                ? "The creator opted into showing exact coordinates on this public page. They are still excluded from the verification JSON."
                : "Approximate location label supplied by the creator. Exact coordinates are excluded from the public page and the verification JSON by default."}
            </p>
            {exactCoordinates ? (
              <details className="mt-3 text-[11px] text-muted">
                <summary className="cursor-pointer text-ink-soft">
                  Exact coordinates shared by creator
                </summary>
                <p className="hash mt-2">
                  {exactCoordinates.latitude.toFixed(5)},{" "}
                  {exactCoordinates.longitude.toFixed(5)}
                </p>
              </details>
            ) : null}
          </section>

          <section className="provenance-box">
            <div className="provenance-box__head">
              <p className="eyebrow">Cite this record</p>
            </div>
            <div className="embed-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/badge/${document.record.slug}`}
                alt={`Verification badge for ${document.record.title}`}
                width={480}
                height={150}
              />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-muted">
                Embed snippet
              </summary>
              <pre className="embed-code mt-2">{badgeSnippet}</pre>
              <div className="mt-2">
                <CopyButton
                  value={badgeSnippet}
                  label="Copy embed code"
                  className="btn btn--outline btn--sm"
                />
              </div>
            </details>
          </section>

          <div className="provenance-note">
            <p className="eyebrow mb-2">A note on scope</p>
            <p>
              This record is evidence, not truth. The seal establishes record
              integrity and signer custody. It is not a legal signature, an identity
              guarantee, or an external timestamp.
            </p>
          </div>
        </aside>
      </div>

      <footer className="public-record__footer">
        <span>Record {shortHash(document.integrity.recordHash, 10)}</span>
        <span>
          Published{" "}
          {formatDate(document.record.publishedAt ?? document.record.createdAt)}
        </span>
        <span>Proof of Experience · evidence, not truth.</span>
      </footer>
    </article>
  );
}
