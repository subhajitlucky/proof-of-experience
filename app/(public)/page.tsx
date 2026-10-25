import Link from "next/link";
import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo-badge";
import { TrustSeal } from "@/components/trust";
import { getFeaturedDemo } from "@/lib/services/public-verification";
import { getCurrentUser } from "@/lib/session";
import { formatDateRange, formatShortDate, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proof that a human was there",
  description:
    "Signed, witness-backed records for experiences worth trusting. An evidence and attestation layer for human-lived experience.",
};

export default async function HomePage() {
  const [featured, user] = await Promise.all([
    getFeaturedDemo(),
    getCurrentUser(),
  ]);
  const createHref = user ? "/dashboard/new" : "/register";
  const demo = featured?.document;

  return (
    <>
      <section className="home-hero wrap">
        <div className="home-hero__copy">
          <p className="eyebrow eyebrow--accent">Evidence &amp; attestation layer</p>
          <h1 className="home-hero__title">Proof that a human was there.</h1>
          <p className="home-hero__lede">
            Signed, witness-backed records for experiences worth trusting.
          </p>
          <p className="home-hero__support">
            Bring the claims, media, people, place and time. We hash the evidence,
            seal the record, and make every witness attestation inspectable. No
            opaque score. No claim of absolute truth.
          </p>
          <div className="home-hero__actions">
            <Link className="btn btn--primary" href={createHref}>
              Create a record
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              className="btn btn--outline"
              href={demo ? `/verify/${demo.record.slug}` : "/#how-it-works"}
            >
              Verify a demo record
            </Link>
          </div>
          <div className="home-hero__meta">
            <span>For makers, guides, institutions and the people who vouch for them.</span>
            <span className="hidden sm:inline">Ed25519 · SHA-256 · witness-attested</span>
          </div>
        </div>

        <aside className="specimen" aria-label="Demo verification record preview">
          <div className="specimen__top">
            <span className="eyebrow">Public record</span>
            <span className="eyebrow">Specimen</span>
          </div>
          {demo ? (
            <>
              <div className="specimen__cover">
                {featured?.coverPublicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.coverPublicUrl}
                    alt={`Demo record cover: ${demo.record.title}`}
                  />
                ) : (
                  <div className="specimen__cover-fallback" aria-hidden="true">
                    <span>PoE</span>
                  </div>
                )}
                <div className="specimen__cover-meta">
                  <span>{demo.record.location}</span>
                  <span>{formatShortDate(demo.record.startAt)}</span>
                </div>
              </div>
              <div className="specimen__body">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <DemoBadge />
                    <span className="pill">{demo.record.category}</span>
                  </div>
                  <TrustSeal level={demo.trust.level} label={demo.trust.label} ink />
                </div>
                <h2 className="specimen__title">{demo.record.title}</h2>
                <p className="specimen__creator">
                  {demo.record.creator.name}{" "}
                  <span className="text-faint">@{demo.record.creator.handle}</span>
                </p>
                <dl className="specimen__facts">
                  <div>
                    <dt>Witnesses</dt>
                    <dd>{demo.trust.witnessCount} independent</dd>
                  </div>
                  <div>
                    <dt>Evidence events</dt>
                    <dd>{demo.evidenceEvents.length} chained</dd>
                  </div>
                  <div>
                    <dt>Record hash</dt>
                    <dd className="hash--short">{shortHash(demo.integrity.recordHash, 10)}</dd>
                  </div>
                </dl>
                <div className="specimen__foot">
                  <span className="flex items-center gap-2">
                    <span className="specimen__status-dot" aria-hidden="true" />
                    Seal verified
                  </span>
                  <Link className="textlink" href={`/verify/${demo.record.slug}`}>
                    Inspect record
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="specimen__empty">
              <p>Seed the demo catalogue to inspect a signed record.</p>
              <code className="hash">npm run db:seed</code>
            </div>
          )}
          <p className="specimen__disclaimer">
            Demo fiction. This specimen uses fictional people and events.
          </p>
        </aside>
      </section>

      <section className="home-principles wrap-wide" aria-label="How the record works">
        {[
          ["01", "Claims named", "Every statement is discrete, specific and attached to evidence."],
          ["02", "Witnesses named", "A witness signs one claim, not a vibe. Relationship is confirmed."],
          ["03", "Integrity inspectable", "Every event is hash-chained. Any post-signature change is visible."],
          ["04", "Trust is explained", "Criteria are listed in plain language, never collapsed into a score."],
        ].map(([number, title, copy]) => (
          <div className="principle" key={number}>
            <span className="principle__number">{number}</span>
            <h2 className="principle__title">{title}</h2>
            <p className="principle__copy">{copy}</p>
          </div>
        ))}
      </section>

      <section id="how-it-works" className="home-section wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The method</p>
            <h2 className="mt-4">From lived experience to an inspectable record.</h2>
          </div>
          <p className="section-heading__intro">
            The system records evidence and attestation, then shows its working.
            Nothing is hidden behind a single trust badge.
          </p>
        </div>

        <ol className="process">
          <li className="process__step">
            <span className="process__number">01</span>
            <div>
              <h3>Record what happened.</h3>
              <p>
                Gather claims, participants, place, time and media. Images are
                hashed with SHA-256. The evidence timeline is chain-linked so
                additions and edits can be followed.
              </p>
            </div>
            <span className="process__aside">FILES · CLAIMS · TIME</span>
          </li>
          <li className="process__step">
            <span className="process__number">02</span>
            <div>
              <h3>Ask someone to vouch for a claim.</h3>
              <p>
                Each witness receives a unique, expiring, single-use link to one
                specific claim. They confirm their name and relationship, then
                sign against the current record hash.
              </p>
            </div>
            <span className="process__aside">ONE CLAIM · ONE LINK</span>
          </li>
          <li className="process__step">
            <span className="process__number">03</span>
            <div>
              <h3>Publish the evidence, not a verdict.</h3>
              <p>
                A public page presents the record, the criteria, the witness count,
                the exact hashes and the current integrity status. Readers decide
                what the evidence is worth.
              </p>
            </div>
            <span className="process__aside">PUBLIC · DOWNLOADABLE</span>
          </li>
        </ol>
      </section>

      <section id="scope" className="home-dark">
        <div className="wrap">
          <div className="home-dark__head">
            <p className="eyebrow">A necessary distinction</p>
            <h2>Evidence can be intact. That does not make it true.</h2>
          </div>
          <div className="proof-columns">
            <div className="proof-column">
              <p className="eyebrow">The seal can establish</p>
              <ul>
                <li>The record matches the hash signed by its custodian.</li>
                <li>Specific media files have known SHA-256 fingerprints.</li>
                <li>Named claims carry witness attestations.</li>
                <li>A change after signing is detectable and labelled.</li>
              </ul>
            </div>
            <div className="proof-column">
              <p className="eyebrow">The seal cannot establish</p>
              <ul>
                <li>That every statement is true.</li>
                <li>Identity beyond the invited witness link.</li>
                <li>An independent timestamp; external anchoring is not implemented.</li>
                <li>Legal validity, notarisation, or absolute authenticity.</li>
              </ul>
            </div>
          </div>
          <div className="home-dark__foot">
            <p>
              The MVP signs with a server-held Ed25519 key. Creator-held keys and
              external anchoring are explicit future seams, not present claims.
            </p>
          </div>
        </div>
      </section>

      <section className="home-section wrap">
        <div className="audiences">
          <div>
            <p className="eyebrow">Who it is for</p>
            <h2>People whose work leaves traces.</h2>
          </div>
          <div className="audience-grid">
            <article>
              <h3>Makers &amp; studios</h3>
              <p>
                Ceramicists, chefs, artists and producers who want a record of the
                process, the place and the people who saw it.
              </p>
            </article>
            <article>
              <h3>Travel &amp; field operators</h3>
              <p>
                Guides and operators documenting participation, field conditions
                and the specific claims travellers care about.
              </p>
            </article>
            <article>
              <h3>Cultural institutions</h3>
              <p>
                Museums, fairs and marketplaces assembling provenance and program
                evidence that a reader can inspect.
              </p>
            </article>
          </div>
        </div>
      </section>

      {demo ? (
        <section className="home-feature wrap">
          <div className="home-feature__image">
            {featured?.coverPublicUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.coverPublicUrl}
                alt={`Demo cover for ${demo.record.title}`}
              />
            ) : null}
          </div>
          <div className="home-feature__copy">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Open the specimen</p>
              <DemoBadge />
            </div>
            <h2>{demo.record.title}</h2>
            <p className="text-muted">{demo.record.summary}</p>
            <dl className="inline-dl mt-6">
              <div>
                <dt>Dates</dt>
                <dd>{formatDateRange(demo.record.startAt, demo.record.endAt)}</dd>
              </div>
              <div>
                <dt>Trust level</dt>
                <dd>{demo.trust.label}</dd>
              </div>
              <div>
                <dt>Record integrity</dt>
                <dd>{demo.integrity.altered ? "Altered" : "Seal verified"}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn--primary" href={`/verify/${demo.record.slug}`}>
                Inspect this record
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link
                className="btn btn--outline"
                href={`/api/verify/${demo.record.slug}?download=1`}
              >
                Download JSON
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="home-close">
        <div className="wrap">
          <p className="eyebrow">Begin a record</p>
          <h2>If a human was there, make it checkable.</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn btn--accent" href={createHref}>
              Create a record
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="btn btn--outline" href="/login">
              Explore the demo account
            </Link>
          </div>
          <p className="mt-6 text-xs text-faint">
            Demo sign-in is available on the sign-in page. All seeded people and
            records are fictional.
          </p>
        </div>
      </section>
    </>
  );
}
