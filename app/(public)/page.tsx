import Link from "next/link";
import type { Metadata } from "next";
import { DemoBadge } from "@/components/demo-badge";
import { TrustSeal } from "@/components/trust";
import { getDemoRecords } from "@/lib/services/public-verification";
import { getCurrentUser } from "@/lib/session";
import {
  categoryLabel,
  formatDateRange,
  formatShortDate,
  shortHash,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proof that a human was there",
  description:
    "Signed, witness-backed records for experiences worth trusting. An evidence and attestation layer for human-lived experience.",
};

const chain = [
  {
    number: "01",
    title: "Claim",
    copy: "Each assertion is specific, discrete and placed on the record. No vague bundle of promises.",
    meta: "Named assertion",
  },
  {
    number: "02",
    title: "Witness",
    copy: "A single-use link opens one claim. The witness confirms their relationship before signing.",
    meta: "One claim / one link",
  },
  {
    number: "03",
    title: "Hash",
    copy: "Images are re-encoded, fingerprinted with SHA-256 and chained in sequence with capture metadata.",
    meta: "SHA-256 chain",
  },
  {
    number: "04",
    title: "Seal",
    copy: "The record and its evidence chain are signed with Ed25519, then checked on every verification.",
    meta: "Ed25519 signature",
  },
];

const methodSteps = [
  {
    number: "01",
    title: "Assemble the file",
    copy: "Add claims, participants, place, time and media. Images are re-encoded for privacy, hashed, and placed into a chain-linked evidence timeline.",
    spec: "Claims / files / time",
  },
  {
    number: "02",
    title: "Put it before a witness",
    copy: "A single-use link opens one specific claim. The witness confirms their name and relationship, then signs against the record hash in force at that moment.",
    spec: "One claim / one link",
  },
  {
    number: "03",
    title: "Open it for inspection",
    copy: "The public file shows the seal, the evidence, the witness count and the exact criteria behind its trust level. The verification JSON exposes the machinery, not private data.",
    spec: "Evidence / JSON / badge",
  },
];

const audiences = [
  {
    number: "01",
    title: "Makers & studios",
    copy: "Ceramicists, chefs, artists and producers documenting process, place and the people who saw it.",
  },
  {
    number: "02",
    title: "Travel & field operators",
    copy: "Guides and operators making participation, conditions and specific claims inspectable.",
  },
  {
    number: "03",
    title: "Cultural institutions",
    copy: "Museums, fairs and marketplaces assembling provenance and program evidence.",
  },
  {
    number: "04",
    title: "Verifiers & collectors",
    copy: "Buyers, readers and researchers who want to inspect the record instead of trusting a badge.",
  },
];

const canEstablish = [
  "That the record still matches the hash that was signed.",
  "That specific media files carry known SHA-256 fingerprints.",
  "That named claims carry witness attestations.",
  "That a change after signing is detectable and labelled.",
];

const cannotEstablish = [
  "That the account itself is true.",
  "Identity beyond the witness invitation.",
  "An external timestamp; anchoring is not implemented.",
  "Legal validity, notarisation or absolute authenticity.",
];

export default async function HomePage() {
  const [demos, user] = await Promise.all([getDemoRecords(), getCurrentUser()]);
  const featured = demos[0] ?? null;
  const demo = featured?.document;
  const createHref = user ? "/dashboard/new" : "/register";

  return (
    <>
      <section className="dossier-hero">
        <div className="dossier-hero__grid wrap-wide">
          <div className="dossier-hero__copy">
            <p className="dossier-file">
              <span>File 2026 / 001</span>
              <span>Public inspection copy</span>
            </p>
            <p className="dossier-kicker">
              <span aria-hidden="true" />
              Evidence &amp; attestation layer
            </p>
            <h1 className="dossier-hero__title">
              Proof that a<br />
              human was there<span aria-hidden="true">.</span>
            </h1>
            <p className="dossier-hero__lede">
              Signed, witness-backed records for experiences worth trusting.
            </p>
            <p className="dossier-hero__body">
              A public record format for what was made, seen, served, guided or
              witnessed. Claims are named. Evidence is hashed. Witnesses sign
              specific statements. The integrity of the record can be inspected.
            </p>
            <div className="dossier-hero__actions">
              <Link className="btn btn--primary" href={createHref}>
                Create a record
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
              <Link
                className="btn btn--outline"
                href={demo ? `/verify/${demo.record.slug}` : "/#cases"}
              >
                Inspect a case file
              </Link>
            </div>
            <dl className="dossier-hero__stats">
              <div>
                <dt>Seal</dt>
                <dd>Ed25519</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>SHA-256 chain</dd>
              </div>
              <div>
                <dt>Witness</dt>
                <dd>Named attestation</dd>
              </div>
            </dl>
          </div>

          {demo ? (
            <aside className="specimen" aria-label="Featured reference record">
              <div className="specimen__bar">
                <span>Specimen / 01</span>
                <span className="specimen__bar-right">
                  <DemoBadge />
                  <span>Reference copy</span>
                </span>
              </div>
              <figure className="specimen__figure">
                {featured.coverPublicUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featured.coverPublicUrl}
                    alt={`Demo record cover: ${demo.record.title}`}
                  />
                ) : (
                  <div className="specimen__fallback">PoE</div>
                )}
                <div className="specimen__stamp">
                  <TrustSeal level={demo.trust.level} label={demo.trust.label} />
                </div>
                <figcaption>
                  <span>Plate 01 / cover evidence</span>
                  <span>{formatDateRange(demo.record.startAt, demo.record.endAt)}</span>
                </figcaption>
              </figure>
              <div className="specimen__body">
                <p className="specimen__meta">
                  <span>{categoryLabel(demo.record.category)}</span>
                  <span aria-hidden="true">/</span>
                  <span>{demo.record.location}</span>
                </p>
                <h2 className="specimen__title">{demo.record.title}</h2>
                <p className="specimen__creator">
                  {demo.record.creator.name}
                  <span>@{demo.record.creator.handle}</span>
                </p>
                <p className="specimen__summary">{demo.record.summary}</p>
                <dl className="specimen__facts">
                  <div>
                    <dt>Witnesses</dt>
                    <dd>{demo.trust.witnessCount} independent</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>{demo.evidenceEvents.length} events</dd>
                  </div>
                  <div>
                    <dt>Seal</dt>
                    <dd className="hash--short">
                      {shortHash(demo.integrity.recordHash, 8)}
                    </dd>
                  </div>
                </dl>
                <div className="specimen__foot">
                  <span className="specimen__state">
                    <span aria-hidden="true" />
                    {demo.integrity.altered
                      ? "Integrity alert"
                      : "Record integrity verified"}
                  </span>
                  <Link className="specimen__link" href={`/verify/${demo.record.slug}`}>
                    Open case file
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <p className="specimen__note">
                  Demo fiction. Every person, witness and event shown is fictional.
                </p>
              </div>
            </aside>
          ) : (
            <aside className="specimen specimen--empty" aria-label="No reference record">
              <div className="specimen__bar">
                <span>Specimen / 00</span>
                <span>Awaiting seed</span>
              </div>
              <div className="specimen__empty">
                <p className="dossier-kicker">No reference copy</p>
                <h2>Seed the registry to inspect a signed record.</h2>
                <p>
                  Run <code className="hash">npm run db:seed</code> to create the
                  three fictional reference records.
                </p>
              </div>
            </aside>
          )}
        </div>

        <div className="dossier-hero__foot wrap-wide">
          <span>Registry copy / edition 2026</span>
          <span>Evidence can be intact. That does not make it true.</span>
        </div>
      </section>

      <section className="protocol" id="protocol" aria-labelledby="protocol-heading">
        <div className="protocol__inner wrap-wide">
          <header className="protocol__head">
            <div>
              <p className="eyebrow eyebrow--light">Protocol / four commitments</p>
              <h2 id="protocol-heading">A record is a chain of custody.</h2>
            </div>
            <p>
              The system records evidence and attestation, then shows its working.
              No hidden score. Each part of the chain can be inspected on its own.
            </p>
          </header>
          <ol className="protocol__list">
            {chain.map((item) => (
              <li className="protocol__item" key={item.number}>
                <span className="protocol__number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <span className="protocol__meta">{item.meta}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {demos.length > 0 ? (
        <section className="case-index" id="cases" aria-labelledby="cases-heading">
          <div className="wrap-wide">
            <header className="case-index__head">
              <div>
                <p className="eyebrow">Case index / reference records</p>
                <h2 id="cases-heading">
                  Open a file.
                  <br />
                  Inspect the working.
                </h2>
              </div>
              <p>
                Three fictional records, seeded so the full evidence and
                attestation flow can be examined without creating an account. Each
                one shows a different trust level.
              </p>
            </header>
            <div className="case-index__rows">
              {demos.map((entry, index) => (
                <Link
                  className="case-row"
                  href={`/verify/${entry.document.record.slug}`}
                  key={entry.document.record.slug}
                >
                  <span className="case-row__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="case-row__thumb">
                    {entry.coverPublicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.coverPublicUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span>PoE</span>
                    )}
                  </span>
                  <span className="case-row__body">
                    <span className="case-row__meta">
                      {categoryLabel(entry.document.record.category)} /{" "}
                      {formatShortDate(entry.document.record.startAt)}
                    </span>
                    <strong>{entry.document.record.title}</strong>
                    <span className="case-row__place">
                      {entry.document.record.location}
                    </span>
                  </span>
                  <span className="case-row__trust">
                    <span aria-hidden="true" />
                    {entry.document.trust.label}
                  </span>
                  <span className="case-row__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="method" id="how-it-works" aria-labelledby="method-heading">
        <div className="wrap-wide">
          <header className="method__head">
            <div>
              <p className="eyebrow">The method</p>
              <h2 id="method-heading">
                A record is more useful when
                <span> its evidence is legible.</span>
              </h2>
            </div>
            <p>
              The software records the evidence, the witness and the integrity
              check, then lets a reader inspect each layer independently. There is
              no hidden trust score.
            </p>
          </header>
          <ol className="method__steps">
            {methodSteps.map((step) => (
              <li className="method__step" key={step.number}>
                <span className="method__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <span className="method__spec">{step.spec}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="scope" id="scope" aria-labelledby="scope-heading">
        <div className="scope__grid wrap-wide">
          <div className="scope__intro">
            <p className="eyebrow eyebrow--light">A necessary distinction</p>
            <h2 id="scope-heading">
              Evidence can be intact.
              <span> That does not make it true.</span>
            </h2>
            <p>
              The seal makes a record resistant to quiet alteration. It does not
              make every statement correct, verified identity absolute or the
              signature legally valid.
            </p>
            <div className="scope__stamp" aria-hidden="true">
              <span>Public copy</span>
              <strong>Evidence ≠ truth</strong>
              <span>Read the criteria</span>
            </div>
          </div>
          <div className="scope__ledger">
            <div className="scope__column">
              <p className="eyebrow eyebrow--light">The seal can establish</p>
              <ul>
                {canEstablish.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="scope__column">
              <p className="eyebrow eyebrow--light">The seal cannot establish</p>
              <ul>
                {cannotEstablish.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="audience" aria-labelledby="audience-heading">
        <div className="wrap-wide">
          <header className="audience__head">
            <div>
              <p className="eyebrow">For whom</p>
              <h2 id="audience-heading">People whose work leaves traces.</h2>
            </div>
          </header>
          <div className="audience__grid">
            {audiences.map((item) => (
              <div className="audience__item" key={item.number}>
                <span className="audience__number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="closing" aria-labelledby="closing-heading">
        <div className="closing__inner wrap-wide">
          <div>
            <p className="eyebrow">Begin a registry record</p>
            <h2 id="closing-heading">
              If a human was there,
              <br />
              make it checkable.
            </h2>
          </div>
          <div className="closing__actions">
            <Link className="btn btn--primary" href={createHref}>
              Create a record
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link className="btn btn--outline" href="/login">
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
