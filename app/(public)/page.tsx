import Link from "next/link";
import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo-badge";
import { TrustSeal } from "@/components/trust";
import { getFeaturedDemo } from "@/lib/services/public-verification";
import { getCurrentUser } from "@/lib/session";
import { formatDateRange, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proof that a human was there",
  description:
    "Signed, witness-backed records for experiences worth trusting. An evidence and attestation layer for human-lived experience.",
};

const recordAnatomy = [
  {
    number: "01",
    title: "Claims named",
    copy: "Each assertion is specific, discrete and placed on the record.",
  },
  {
    number: "02",
    title: "Witnesses named",
    copy: "A witness signs one claim, after confirming their relationship.",
  },
  {
    number: "03",
    title: "Files hashed",
    copy: "Every image carries a SHA-256 fingerprint and a capture time.",
  },
  {
    number: "04",
    title: "Integrity sealed",
    copy: "The record and its evidence chain are signed with Ed25519.",
  },
];

const methodSteps = [
  {
    number: "01",
    title: "Assemble the record",
    copy: "Add claims, participants, place, time and media. Images are re-encoded for privacy, hashed, and placed into a chain-linked evidence timeline.",
    aside: "Files / claims / time",
  },
  {
    number: "02",
    title: "Invite a witness",
    copy: "A single-use link opens one specific claim. The witness confirms their name and relationship, then signs against the record hash in force at that moment.",
    aside: "One claim / one link",
  },
  {
    number: "03",
    title: "Publish for inspection",
    copy: "The public record shows the seal, the evidence, the witness count and the exact criteria behind its trust level. The verification JSON exposes the machinery, not private data.",
    aside: "Evidence / JSON / badge",
  },
];

export default async function HomePage() {
  const [featured, user] = await Promise.all([getFeaturedDemo(), getCurrentUser()]);
  const createHref = user ? "/dashboard/new" : "/register";
  const demo = featured?.document;

  return (
    <>
      <section className="cover-hero">
        <div className="wrap">
          <div className="cover-hero__folio">
            <span>Public evidence registry</span>
            <span>Reg. 2026 / 001</span>
          </div>

          <div className="cover-hero__grid">
            <div className="cover-hero__main">
              <p className="eyebrow eyebrow--light">Evidence &amp; attestation layer</p>
              <h1 className="cover-hero__title">
                Proof that a human was there.
              </h1>
              <p className="cover-hero__lede">
                Signed, witness-backed records for experiences worth trusting.
              </p>
              <p className="cover-hero__copy">
                A public record format for what was made, seen, served, guided or
                witnessed. Claims are named. Evidence is hashed. Witnesses sign
                specific statements. The integrity of the record can be inspected.
              </p>
              <div className="cover-hero__actions">
                <Link className="btn btn--light" href={createHref}>
                  Create a record
                  <span className="btn__arrow" aria-hidden="true">→</span>
                </Link>
                <Link
                  className="btn btn--ghost-light"
                  href={demo ? `/verify/${demo.record.slug}` : "/#method"}
                >
                  Inspect a specimen
                </Link>
              </div>
              <div className="cover-hero__meta">
                <span>For makers, guides, institutions and their witnesses</span>
                <span>Ed25519 · SHA-256 · witness-attested</span>
              </div>
            </div>

            <aside className="cover-index" aria-label="What a record carries">
              <div className="cover-index__header">
                <span>Record anatomy</span>
                <span>Fig. A</span>
              </div>
              <ol>
                {recordAnatomy.map((item) => (
                  <li key={item.number}>
                    <span className="cover-index__number">{item.number}</span>
                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="cover-stamp" aria-hidden="true">
                <span>Evidence</span>
                <strong>≠ truth</strong>
                <span>Public registry</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {demo ? (
        <section className="specimen-file wrap" aria-labelledby="specimen-heading">
          <div className="specimen-file__tab">
            <span>Reference copy</span>
            <span className="flex items-center gap-2">
              <DemoBadge />
              <span>Specimen 01</span>
            </span>
          </div>
          <div className="specimen-file__grid">
            <div className="specimen-file__media">
              {featured?.coverPublicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.coverPublicUrl}
                  alt={`Demo record cover: ${demo.record.title}`}
                />
              ) : (
                <div className="specimen-file__fallback">PoE</div>
              )}
              <div className="specimen-file__caption">
                <span>{demo.record.location}</span>
                <span>{formatDateRange(demo.record.startAt, demo.record.endAt)}</span>
              </div>
            </div>

            <div className="specimen-file__body">
              <div className="specimen-file__topline">
                <span>Public record / {demo.record.category}</span>
                {!demo.integrity.altered ? (
                  <TrustSeal level={demo.trust.level} label={demo.trust.label} />
                ) : null}
              </div>
              <h2 id="specimen-heading" className="specimen-file__title">
                {demo.record.title}
              </h2>
              <p className="specimen-file__creator">
                {demo.record.creator.name}
                <span>@{demo.record.creator.handle}</span>
              </p>
              <p className="specimen-file__summary">{demo.record.summary}</p>

              <dl className="specimen-file__facts">
                <div>
                  <dt>Witnesses</dt>
                  <dd>{demo.trust.witnessCount} independent</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{demo.evidenceEvents.length} chained events</dd>
                </div>
                <div>
                  <dt>Trust</dt>
                  <dd>{demo.trust.label}</dd>
                </div>
                <div>
                  <dt>Seal</dt>
                  <dd className="hash--short">
                    {shortHash(demo.integrity.recordHash, 10)}
                  </dd>
                </div>
              </dl>

              <div className="specimen-file__footer">
                <span className="specimen-file__status">
                  <span aria-hidden="true" />
                  {demo.integrity.altered ? "Integrity alert" : "Record integrity verified"}
                </span>
                <Link className="textlink" href={`/verify/${demo.record.slug}`}>
                  Inspect this record
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
              <p className="specimen-file__note">
                Demo fiction. Every person, witness and event shown is fictional.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="specimen-file wrap" aria-labelledby="specimen-heading">
          <div className="specimen-file__tab">
            <span>Reference copy</span>
            <span>Awaiting seed</span>
          </div>
          <div className="specimen-file__body">
            <h2 id="specimen-heading" className="specimen-file__title">
              Seed the registry to inspect a signed record.
            </h2>
            <p className="specimen-file__summary">
              Run <code className="hash">npm run db:seed</code> to create the three
              fictional reference records.
            </p>
          </div>
        </section>
      )}

      <div className="registry-rules wrap" aria-label="The four commitments of a record">
        {recordAnatomy.map((item) => (
          <div className="registry-rule" key={item.number}>
            <span>{item.number}</span>
            <strong>{item.title}</strong>
          </div>
        ))}
      </div>

      <section id="how-it-works" className="method-section">
        <div className="wrap method-section__grid">
          <header className="method-section__intro">
            <p className="eyebrow">The method</p>
            <h2>
              A record is more useful when
              <em> its evidence is legible.</em>
            </h2>
            <p>
              The system records evidence and attestation, then shows its working.
              There is no hidden score. A reader can inspect the claim, the witness,
              the file hash and the seal independently.
            </p>
          </header>
          <ol className="method-list" id="method">
            {methodSteps.map((step) => (
              <li className="method-list__item" key={step.number}>
                <span className="method-list__number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
                <span className="method-list__aside">{step.aside}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="scope" className="scope-section">
        <div className="wrap scope-section__grid">
          <div className="scope-section__intro">
            <p className="eyebrow">A necessary distinction</p>
            <h2>
              Evidence can be intact.
              <em> That does not make it true.</em>
            </h2>
            <p>
              The seal makes a record resistant to quiet alteration. It does not
              make every statement correct, verified identity absolute or the
              signature legally valid.
            </p>
            <div className="scope-stamp" aria-hidden="true">
              <span>Public copy</span>
              <strong>Read the criteria</strong>
              <span>not a trust score</span>
            </div>
          </div>

          <div className="scope-ledger">
            <div className="scope-ledger__column">
              <p className="eyebrow">The seal can establish</p>
              <ul>
                <li>That the record still matches the hash that was signed.</li>
                <li>That specific media files carry known SHA-256 fingerprints.</li>
                <li>That named claims carry witness attestations.</li>
                <li>That a change after signing is detectable and labelled.</li>
              </ul>
            </div>
            <div className="scope-ledger__column">
              <p className="eyebrow">The seal cannot establish</p>
              <ul>
                <li>That the account itself is true.</li>
                <li>Identity beyond the witness invitation.</li>
                <li>An external timestamp; anchoring is not implemented.</li>
                <li>Legal validity, notarisation or absolute authenticity.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="audience-section">
        <div className="wrap audience-section__grid">
          <div>
            <p className="eyebrow">For whom</p>
            <h2>People whose work leaves traces.</h2>
          </div>
          <div className="audience-list">
            {[
              ["01", "Makers & studios", "Ceramicists, chefs, artists and producers documenting process, place and the people who saw it."],
              ["02", "Travel & field operators", "Guides and operators making participation, conditions and specific claims inspectable."],
              ["03", "Cultural institutions", "Museums, fairs and marketplaces assembling provenance and program evidence."],
              ["04", "Verifiers & collectors", "Buyers, readers and researchers who want to inspect the record instead of trusting a badge."],
            ].map(([number, title, copy]) => (
              <div className="audience-row" key={number}>
                <span>{number}</span>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing-cover">
        <div className="wrap closing-cover__inner">
          <div>
            <p className="eyebrow eyebrow--light">Begin a registry record</p>
            <h2>
              If a human was there,
              <em> make it checkable.</em>
            </h2>
          </div>
          <div className="closing-cover__actions">
            <Link className="btn btn--light" href={createHref}>
              Create a record
              <span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn--ghost-light" href="/login">
              Explore the demo
            </Link>
            <p>
              Demo sign-in is on the access page. Every seeded person and record is
              fictional.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
