# Proof of Experience

**Proof that a human was there.**

Proof of Experience is an evidence and attestation layer for human-lived experience. A creator assembles a record of claims, media, participants, place and time. The application hashes the record, seals it with Ed25519, invites independent witnesses to sign specific claims, and publishes a verification page that shows what evidence exists, what was attested, and whether anything changed after signing.

It is not a blockchain, a social network, a generic notary, or a claim of absolute truth. A valid seal means the record matches its signed hash and the signer's custody is known. It does not prove that every statement is true, and it is not a legal signature.

---

## Contents

- [What is implemented](#what-is-implemented)
- [Stack](#stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo accounts and records](#demo-accounts-and-records)
- [Commands](#commands)
- [Architecture](#architecture)
- [Integrity model](#integrity-model)
- [Trust levels](#trust-levels)
- [Data model](#data-model)
- [API](#api)
- [Security and privacy decisions](#security-and-privacy-decisions)
- [Testing](#testing)
- [3-minute demo script](#3-minute-demo-script)
- [Known limitations](#known-limitations)
- [Deployment notes](#deployment-notes)

---

## What is implemented

- Credentials authentication with NextAuth, optional Google OAuth, a seeded demo creator and admin account.
- Draft creation with title, summary, category, public location label, optional private coordinates, start/end times, claims, participants, media and visibility.
- Local or S3-compatible media storage, SHA-256 fingerprints, EXIF extraction, metadata stripping, and captured-at timestamps.
- Hash-chained evidence events for creation, media, location, device context, invitations, attestations and publication.
- Server-held Ed25519 record signing and server-mediated witness Ed25519 attestations using expiring, single-use bearer invitations.
- Public verification pages with status/integrity banners, claims, witness counts, hashes, QR code, downloadable JSON, trust criteria, badge and embed snippet.
- Explicit tamper detection: edited signed content, media hashes or attestations produce **“Record altered after signing”** and suppress verified badges.
- Dashboard with record list, draft editing, additional draft media, witness invitations, attestation progress, publish/unpublish, visibility, revoke and delete.
- Admin desk with flag, unflag, revoke and restore actions. Admin actions are written to an append-only PostgreSQL audit log protected by a trigger.
- A designed but deliberately unimplemented `AnchorProvider` interface for future external timestamping.

The public verification route is `/verify/[slug]`. The witness flow is `/attest/[token]`.

---

## Stack

- Next.js 16 App Router and React 19
- TypeScript
- Tailwind CSS v4
- Prisma 6 + PostgreSQL 17
- NextAuth 4 (credentials + optional Google OAuth)
- Zod validation
- Node `crypto` Ed25519, SHA-256, AES-256-GCM
- `sharp` for safe image re-encoding and EXIF removal
- `exifr` for EXIF extraction
- `qrcode` for the verification QR
- Vitest for unit and integration tests
- Playwright for the full browser happy path

---

## Quick start

Requirements: Node 20.9+ (Node 24 recommended), npm, Docker, and Docker Compose.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Generate application secrets and signing/encryption keys
npm run keys:generate
# Copy the three generated lines into .env. Do not commit .env.

# 4. Start PostgreSQL
npm run db:up

# 5. Generate the Prisma client, apply migrations and seed demo data
npm run setup

# 6. Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The demo seed includes three public records, two accounts, attestations and a complete evidence timeline. Seed creation also logs nothing sensitive by default in non-development environments.

If port 3000 is occupied, run the app on another port and point the public URLs at it:

```bash
npm run dev -- -p 3001
# Set APP_URL, NEXT_PUBLIC_APP_URL and NEXTAUTH_URL to http://localhost:3001
```

> The repository includes a local `.env` in the authoring workspace for verification. It is ignored by Git. A fresh checkout should follow the steps above.

### PostgreSQL

Docker Compose provides PostgreSQL on host port `54329`:

- Database: `proof_of_experience`
- User: `proof`
- Password: `proof`
- Connection: `postgresql://proof:proof@localhost:54329/proof_of_experience?schema=public`

Useful commands:

```bash
npm run db:up       # start Postgres
npm run db:down     # stop Postgres (keeps the volume)
npm run db:reset    # drop, migrate and re-seed the local database
npm run db:studio   # Prisma Studio
```

A database reset destroys local demo data. This is intentional for the MVP.

---

## Environment variables

Copy `.env.example` to `.env`. Required values:

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Server-side canonical app URL. Used for witness links and QR codes. |
| `NEXT_PUBLIC_APP_URL` | Public app URL baked into generated links and embeds. |
| `NEXTAUTH_URL` | NextAuth callback URL. Must match the app origin. |
| `NEXTAUTH_SECRET` | NextAuth session signing secret. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `RECORD_SIGNING_PRIVATE_KEY` | Base64 PKCS#8 Ed25519 private key used to seal records. |
| `DATA_ENCRYPTION_KEY` | Base64 32-byte AES-256-GCM key for coordinates and private signing material. |
| `STORAGE_DRIVER` | `local` (default) or `s3`. |

Optional values:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Enables Google OAuth when paired with the secret. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret. |
| `STORAGE_LOCAL_DIR` | Local upload directory, default `./.data/uploads`. |
| `S3_BUCKET` | S3-compatible bucket. |
| `S3_REGION` | S3 region. |
| `S3_ENDPOINT` | Optional custom endpoint for S3-compatible storage. |
| `S3_ACCESS_KEY_ID` | S3 access key. |
| `S3_SECRET_ACCESS_KEY` | S3 secret key. |
| `S3_FORCE_PATH_STYLE` | `true` for path-style S3 endpoints. |
| `ALLOW_DEMO_SEED` | Must be `true` to seed demo accounts with `NODE_ENV=production`. |

Generate the three secret values with:

```bash
npm run keys:generate
```

`RECORD_SIGNING_PRIVATE_KEY` is the identity of the server-held record signer. Rotating it without preserving old public keys will make existing records fail the trusted-signer check. Key rotation and old-key retention are not implemented in the MVP.

Google OAuth is optional. Both variables must be present before startup for the provider to appear. OAuth users are provisioned into the application database on first sign-in.

---

## Demo accounts and records

Demo creator:

```text
demo@proofofexperience.local
demo1234
```

Demo administrator:

```text
admin@proofofexperience.local
admin1234
```

Demo records:

- `/verify/demo-kyoto-raku` — ceramicist, Kyoto. Fully verified.
- `/verify/demo-copenhagen-winter-table` — chef, Copenhagen. Witness verified.
- `/verify/demo-okavango-wild-dogs` — wildlife guide, Botswana. Fully verified.

All creators, witnesses, participants, images and events are fictional. Seeded records, their dashboard entries, and their public pages are explicitly labelled **Demo**. The generated cover plates also carry a `DEMO RECORD` label.

Two additional fictional creator accounts exist for the Copenhagen and Botswana records so the records can have distinct creators:

- `freja.lind@demo.proofofexperience.local`
- `kabelo.mose@demo.proofofexperience.local`

They are not part of the documented demo login flow.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on port 3000. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server after a build. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run typecheck` | Generate Next.js route types and run `tsc --noEmit`. |
| `npm test` | Run all Vitest tests. Requires PostgreSQL. |
| `npm run test:unit` | Run unit tests only. |
| `npm run test:integration` | Run database-backed integration tests. |
| `npm run test:e2e` | Run the Playwright happy path. Starts a dev server on port 3101. |
| `npm run db:up` | Start Docker Compose PostgreSQL. |
| `npm run db:down` | Stop Docker Compose PostgreSQL. |
| `npm run db:migrate` | Create/apply a development migration. |
| `npm run db:deploy` | Apply committed migrations in production. |
| `npm run db:seed` | Seed demo users and records. |
| `npm run db:reset` | Drop and recreate the local database, then seed. |
| `npm run db:studio` | Open Prisma Studio. |
| `npm run setup` | Generate Prisma client, deploy migrations, seed. |
| `npm run keys:generate` | Print new NextAuth, Ed25519 and encryption secrets. |

---

## Architecture

```text
app/
  (public)/                 landing, public verification, witness attestation
  (auth)/                   sign-in and registration
  (app)/                    creator dashboard, admin desk, settings
  api/                      route handlers
components/                 editorial UI and small interactive islands
lib/
  canonical.ts              deterministic JSON serialization
  record.ts                 canonical record projection and hashing
  keys.ts                   Ed25519 signing and verification
  evidence.ts               evidence chain hashing and verification
  verification.ts           integrity analysis, trust and public JSON projection
  trust.ts                  transparent trust-level policy
  storage.ts                local/S3 storage adapter
  media.ts                  file validation, EXIF, sanitization, hashing
  services/                 database-backed domain services
  auth.ts / session.ts      NextAuth and server-side authorization
prisma/
  schema.prisma             PostgreSQL data model
  migrations/               committed SQL migrations and audit trigger
  seed.ts                   three demo records
  seed-assets/              original generated demo plates
tests/
  unit/                     canonicalization, hashing, signatures, trust
  integration/              create → invite → attest → publish → verify
  e2e/                      one full browser happy path
```

### Request boundaries

- Pages under `(app)` require a database-backed session before rendering.
- Every API mutation validates the browser origin in addition to relying on SameSite cookies and NextAuth's own CSRF protection.
- API routes check ownership or admin role against the database on every request.
- Public verification only reads records that are public/unlisted, have been published, and are in `published`, `flagged` or `revoked` status.
- Public media is served through `/api/media/[id]` with the same visibility gate. Private and draft media is only available to its owner or an admin.
- Exact coordinates are decrypted only for the owner API and for the public page when the creator explicitly opted into exact display. They are never included in verification JSON.

### Storage

The `StorageAdapter` interface has two implementations:

- Local filesystem storage under `STORAGE_LOCAL_DIR`.
- S3-compatible storage using the AWS SDK, with optional custom endpoint and path-style addressing.

Media is re-encoded with `sharp` after EXIF is extracted. This removes embedded EXIF/GPS metadata before storage and hashing. The stored file's SHA-256, MIME type, capture date and privacy-safe EXIF summary are committed into the record. Original uploaded bytes are not retained.

### Evidence chain

Each `EvidenceEvent` includes:

- a per-record sequence,
- event type and timestamp,
- optional actor and private payload,
- the previous event hash,
- its own hash over a canonical event envelope.

The record hash commits to the event hashes. Verification rebuilds and validates the chain. Private event payloads never appear in public output.

### Seal lifecycle

1. A draft may be edited and may receive additional media without a signature.
2. The first witness invitation or a publish action seals the current record with Ed25519.
3. Each new authorised evidence event, attestation, publish/unpublish, or admin status change appends to the chain and re-seals the record using the server-held key.
4. A witness signature is made over the record hash in force at the moment of signing. The attestation stores that historical signed hash and its signature. The current record may later be resealed to include new evidence, but every witness signature remains independently verifiable against its stored signed hash.
5. No API allows the owner to edit substantive content after sealing. An altered record is never silently re-sealed, including by an admin action.

### Canonical payload

The payload used for `recordHash` includes:

- the record ID, creator ID, slug, title, summary, category, public location label, coordinate-presence flag, and start/end times;
- ordered claims with evidence notes;
- media fingerprints, MIME types, sizes, capture times, cover flag, GPS-presence flag, and privacy-safe EXIF summary;
- ordered participants by name and role;
- attestation metadata, public key, signed hash, relationship, timestamp, and a private-name commitment;
- the evidence event sequence and hashes.

It excludes signatures, witness emails, witness names, participant emails, sealed status, visibility, trust level, exact coordinates, QR data, and private evidence payloads. Canonical JSON sorts object keys recursively and preserves explicit array order.

`recordHash = SHA-256(canonicalJsonize(payload))`; the signature is Ed25519 over the 64-character hex hash string.

---

## Trust levels

The criteria are always shown in the UI. There is no weighted or hidden score.

| Level | Criteria |
| --- | --- |
| `self_attested` | A sealed record exists (or the record is still an unsigned draft). |
| `location_verified` | A creator-confirmed location event is present. This is creator context, not independent geolocation. |
| `device_verified` | Camera metadata or a creator-confirmed device-context event is present. |
| `witness_verified` | Two or more independent witnesses have valid signatures. |
| `fully_verified` | Location evidence + device context + two or more independent witnesses. |

Independence in this MVP means different normalized witness email addresses, none equal to the creator's email. It is a policy, not an identity guarantee. The system prevents inviting the creator and prevents inviting the same email twice to one record.

Attestation payloads sign:

```text
claimId + recordHash + witnessId + timestamp
```

with a domain-separated canonical envelope.

---

## Data model

Core Prisma models:

- **User** — name, email, public handle, bio, optional avatar URL, bcrypt password hash, profile Ed25519 public key, encrypted private key, role.
- **Experience** — creator, slug, content, encrypted coordinates, visibility, status, seal hash/signature/public key, trust level, publication/flag/revocation metadata.
- **Claim** — ordered statements with optional evidence notes.
- **MediaAsset** — sanitized file metadata, storage key, SHA-256, capture time, EXIF summary, GPS presence, encrypted GPS values, cover flag.
- **Participant** — name, role, private optional email.
- **Witness** — invited name, private email, hashed invitation token, expiry, server-mediated keypair, use state.
- **Attestation** — signed attestation metadata, confirmed name, public relationship, signature and signed record hash.
- **EvidenceEvent** — hash-chained timeline.
- **AuditLog** — append-only admin actions, protected by a PostgreSQL trigger.

The profile keypair is provisioned so a future version can let creators self-custody record signing. Today, record seals are made with the configured server key. Witness keys are also held server-side, encrypted at rest, during the MVP.

Schema: [`prisma/schema.prisma`](prisma/schema.prisma). Implementation plan and model notes: [`docs/PLAN.md`](docs/PLAN.md).

---

## API

All mutation APIs require an authenticated browser session where applicable and a trusted `Origin`. Errors consistently use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": [{ "path": "title", "message": "..." }]
  }
}
```

| Method | Route | Notes |
| --- | --- | --- |
| `POST` | `/api/experiences` | Create via JSON or multipart form data. Ownership from session. |
| `GET` | `/api/experiences` | Current creator's records. |
| `GET` | `/api/experiences/[id]` | Owner-only safe projection. |
| `PATCH` | `/api/experiences/[id]` | Draft-only update; signed content is immutable. |
| `DELETE` | `/api/experiences/[id]` | Owner deletion; removes media files. |
| `POST` | `/api/experiences/[id]/publish` | `{ "action": "publish" \| "unpublish" }`. |
| `POST` | `/api/experiences/[id]/witnesses` | Create a single-use invitation. |
| `POST` | `/api/experiences/[id]/media` | Add images to an unsigned draft. |
| `POST` | `/api/experiences/[id]/evidence` | Add creator location/device context. |
| `POST` | `/api/experiences/[id]/visibility` | Change visibility when not published. |
| `POST` | `/api/experiences/[id]/revoke` | Owner revoke. |
| `GET` | `/api/attestations/[token]` | Invitation view; never returns the witness email. |
| `POST` | `/api/attestations/[token]` | Submit a signed witness attestation; single use. |
| `GET` | `/api/verify/[slug]` | Public verification JSON; `?download=1` adds a download disposition. |
| `GET` | `/api/badge/[slug]` | Public SVG badge. |
| `POST` | `/api/admin/experiences/[id]` | Admin flag/unflag/revoke/restore with a reason. |
| `PATCH` | `/api/account` | Update profile. |
| `DELETE` | `/api/account` | Delete account and owned data. |

Rate limits (fixed window, process-local):

- Attestation view: 30 requests / 10 minutes per IP + token hash.
- Attestation submit: 8 requests / 15 minutes per IP + token hash.
- Verification JSON: 90 requests / minute per IP + slug.
- Badge: 240 requests / minute per IP.
- Sensitive creation/invitation/admin/profile routes have additional creator-scoped limits in their route handlers.

Rate limiting is bypassed in `NODE_ENV=test`.

---

## Security and privacy decisions

- **No private record exposure.** API access, media access and verification all enforce visibility and status. Witness invitations require the bearer token.
- **CSRF.** Custom mutations require a same-origin `Origin` header. Auth.js protects its own sign-in/sign-out endpoints. Session cookies are SameSite `Lax`.
- **Coordinates.** Exact coordinates and image GPS are AES-256-GCM encrypted at rest. Public output shows a creator-supplied approximate location. Exact coordinates appear on the public page only when the creator opts in, and never in verification JSON.
- **EXIF.** GPS and other metadata are extracted before uploads are sanitized. The sanitized file is what gets hashed and served. This prevents private GPS from leaking through image bytes.
- **Witness privacy.** Witness names and email addresses are excluded from public pages and download JSON. The database retains the confirmed name privately so the creator can review it. A public relationship field is explicitly shown to the witness before signing.
- **Attestation tokens.** Tokens are random 32-byte values. Only their SHA-256 hashes are stored. They expire after seven days and become unusable upon signature. Submission runs in a serializable transaction with a unique witness-to-attestation constraint.
- **Files.** Only JPEG, PNG and WebP are accepted, verified by magic bytes, decoded and re-encoded with sharp. SVG is rejected to avoid stored XSS. Public media is served with `nosniff`, a restricted CSP and an opaque filename.
- **Authorization.** Route handlers resolve the session user from the database. Resource ownership or admin role is checked server-side; the client is never trusted for `creatorId` or role.
- **Sensitive fields.** Encrypted coordinates, witness emails, invitation hashes, encrypted private keys, and evidence payloads are not included in public projections.
- **Append-only audit.** The PostgreSQL trigger rejects both updates and deletes on `AuditLog`.
- **Signatures.** The UI and README consistently describe integrity and custody, not truth or legal validity.
- **Headers.** The app sets `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `X-Frame-Options`. The CSP for generated SVG badges is restrictive.

---

## Testing

Test coverage includes:

- stable canonical JSON and SHA-256 vectors;
- Ed25519 record and attestation signing/verification;
- record hashes changing when claims, media hashes or witness attestations change;
- unsigned drafts not being lifted into higher trust levels;
- all trust-level rules and transparent criteria;
- a database-backed integration flow: create → invite → attest → publish → verify;
- single-use invitation enforcement;
- exact-coordinate and witness-email exclusion from public JSON;
- tamper detection for claims, media and attestation changes;
- one Playwright flow covering create, media upload, two claims, two witness invitations, both witness signatures, publish, verification, QR presence, JSON download and private-data exclusion.

Run:

```bash
# PostgreSQL must be running
npm run db:up
npm run db:seed   # if the database is empty

npm run lint
npm run typecheck
npm test
npm run build
```

Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration starts its own development server on port **3101** and uses the seeded demo account. Stop any other `next dev` process for this repository before running it; Next.js 16 permits one development server per project.

---

## 3-minute demo script

**0:00–0:25 — Positioning**
Open `/`. Point out the headline, the specimen verification card, and the explicit distinction between evidence and truth. Show that no logos, customers or traction claims are used.

**0:25–0:45 — Inspect a signed record**
Open `/verify/demo-kyoto-raku`. Walk through the verified banner, trust criteria, claims with witness counts, chained evidence timeline, media hashes, QR code and record hash. Download the verification JSON and show that it excludes witness emails and exact coordinates.

**0:45–1:45 — Create and invite**
Sign in as `demo@proofofexperience.local` / `demo1234`. Create an experience with two claims and a photo. Open the draft. Add creator device context. Invite two witnesses to specific claims using the generated single-use links. Explain that development mode logs the links server-side but no email provider is required.

**1:45–2:30 — Witness attestation**
Open each invitation in a private window. Point out that the witness sees the specific claim, record hash and context; confirm name and relationship; sign. Show the stamp confirmation. Return to the creator page and publish.

**2:30–2:50 — Public verification**
Open the public page. Show the fully verified criteria, the claims with witness counts, the timeline addition events, the QR link and the JSON download. Note that the URL and QR are the canonical verification entry point.

**2:50–3:00 — Admin response**
Sign in as `admin@proofofexperience.local` / `admin1234`. Open `/admin`, flag the record with a reason, refresh the public page to show the review banner, then unflag. Show the append-only audit entry.

Optional tamper demonstration (resets with `npm run db:reset`):

```bash
docker compose exec db psql -U proof -d proof_of_experience -c \
"UPDATE \"Claim\" SET text = text || ' (edited after signing)' WHERE id = (SELECT id FROM \"Claim\" WHERE \"experienceId\" = (SELECT id FROM \"Experience\" WHERE slug = 'demo-kyoto-raku') ORDER BY position LIMIT 1);"
```

Reload `/verify/demo-kyoto-raku`. The page shows **“Record altered after signing”**, removes the verified seal and marks the badge as altered. Run `npm run db:reset` to restore the demo catalogue.

---

## Known limitations

These are deliberate MVP limits, not hidden behaviour:

- **Server-held keys.** The record signing key lives in an environment variable. Witness keys and profile keys are held encrypted on the server. There is no browser-held creator or witness key, no hardware-key flow and no key rotation.
- **No external timestamp anchor.** The `AnchorProvider` interface is a future seam. No RFC 3161 timestamp, transparency log or blockchain is implemented, and the system does not claim one.
- **Witness identity is link-based.** Possession of the invitation and email uniqueness are the independence policy. The MVP does not verify government identity.
- **Media bytes are not re-hashed on every verification.** SHA-256 is computed when media is ingested and that hash is signed into the record. A production system should add periodic storage-integrity checks or proof of retrievability; the current public page validates the recorded hash, not live object bytes.
- **Re-encoding for privacy.** Uploaded images are re-encoded to remove metadata. The hash is of the sanitized stored file, not the original camera file. This is a deliberate privacy trade-off.
- **Locations are creator-supplied.** A location event records a creator confirmation, not independent geolocation.
- **No email delivery.** Development witness links are returned to the authenticated creator and logged in development. A production deployment must add a delivery provider and consider token-in-URL logging.
- **In-memory rate limits.** They reset with the process and are not shared across instances.
- **Deletion is destructive.** Record and account deletion remove evidence rather than preserving a revocation tombstone. Revocation is the durable public alternative.
- **Single signing key.** The trusted signer check compares against the currently configured server public key. Changing that key without a rotation plan causes existing records to show as altered.
- **Rate and pagination.** No shared rate store, pagination or background jobs.
- **Legal scope.** No signature here is a legal or qualified electronic signature.

---

## Deployment notes

- Set `APP_URL`, `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to the external HTTPS origin. Set them before `npm run build`; rebuild if the public URL changes.
- Use a strong random `NEXTAUTH_SECRET`, a generated Ed25519 signing key and a 32-byte data encryption key. Back them up through a secrets manager.
- Set `STORAGE_DRIVER=s3` and complete the S3 variables for production media. Object buckets should be private; the app serves media through its authorization gate.
- Run `npm run db:deploy` before starting. The seed script refuses to create demo credentials in production unless `ALLOW_DEMO_SEED=true` is explicitly set.
- Add an email delivery provider for witness invitations if tokens are not to be manually distributed. Do not log invitation URLs in production.
- Place the app behind TLS. The same-origin check supports `x-forwarded-host` and `x-forwarded-proto`.
- Use a shared rate-limit store (for example Redis) if the app runs with more than one server process.
- Replace server-held signing with a creator-held key flow, and add external anchoring, before making stronger provenance claims.
- Pin or rotate dependencies with a security review. `npm audit` is clean at the time of this build.

The interface deliberately says **evidence, not truth**.

---

## Fonts and assets

Fraunces and Public Sans are self-hosted WOFF2 files. Their SIL Open Font License files are included in `public/fonts/`. Demo cover plates were generated for this repository by `scripts/generate-demo-images.py` and carry a Demo label. The test image in `tests/fixtures/print-studio.png` is also generated for this repository.
