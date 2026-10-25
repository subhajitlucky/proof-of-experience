# Proof of Experience — MVP implementation plan

## Product definition

Proof of Experience is an evidence and attestation layer for human-lived experience. A creator assembles a record (claims, media, participants, place and time). The system hashes the record, signs it with a server-held Ed25519 key, and invites independent witnesses to sign specific claims. Public verification shows what evidence exists, who attested (without exposing private details), and whether the record has changed since it was signed.

This product does **not** prove truth. It makes a record tamper-evident and makes its evidence legible. It is not a blockchain, a social network, a notary, or an AI moderation system.

## Architecture

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4.
- PostgreSQL through Prisma.
- NextAuth credentials authentication with JWT sessions. Google OAuth is enabled only when its environment variables exist.
- Route Handlers for the JSON API, with Zod validation and one consistent error envelope.
- Server-rendered public verification pages. All public data is assembled by a single verifier service so API and page agree.
- Local filesystem storage in development. S3-compatible storage through the same `StorageAdapter` interface in production.
- Ed25519 signatures through Node's `crypto` module.
- AES-256-GCM encryption for exact coordinates, witness private keys, and user private keys at rest.
- In-memory sliding-window rate limits for token and verification endpoints. This is suitable for a single-node MVP; a production deployment should use a shared store such as Redis.
- Append-only `AuditLog` table enforced by a PostgreSQL trigger.

## Data model

- **User**: credentials profile, handle, role, Ed25519 public key, encrypted private key.
- **Experience**: creator-owned record, public slug, visibility, status, exact times, encrypted coordinates, approximated location label, server signature, record hash, trust level.
- **Claim**: ordered statements in the record, each optionally carrying evidence text.
- **MediaAsset**: hashed upload with MIME type, capture time, privacy-safe EXIF summary, optional encrypted EXIF GPS.
- **Participant**: a named participant and role; email is private.
- **Witness**: invited person associated with a claim, with a hashed single-use expiring token and server-mediated Ed25519 keypair.
- **Attestation**: immutable signature over claim ID, witness ID, timestamp, and the record hash in force when signed.
- **EvidenceEvent**: append-only, hash-chained timeline; each event commits to the previous event hash.
- **AuditLog**: append-only admin action log, protected by a database trigger.

## Signing and integrity model

1. A canonical record payload is built from the public record content, claims, media hashes, participants, witness attestation metadata, and evidence event hashes. It excludes signatures, status, visibility, exact coordinates, witness emails, and all private data.
2. `recordHash = SHA-256(canonicalJsonize(payload))`.
3. The server signs `recordHash` with Ed25519 and stores the signature plus the public key.
4. Attestations are signed over `{claimId, recordHash, witnessId, timestamp}`. The hash used is the record hash in force when the witness signed. The experience is resealed after an attestation, so the attestation remains a verifiable signature over a known record version.
5. Public verification recomputes the record hash from live data, verifies the server signature, validates the evidence chain, and verifies every attestation signature. Any mismatch produces the explicit "Record altered after signing" state and suppresses verified badges.
6. Signed record content is immutable through the API. Changes after signing are possible only through explicit, resealed evidence events (new invited witnesses, attestations, status changes). Direct database tampering is detectable.

## Trust levels

Criteria are shown in the UI; there is no hidden score.

- `self_attested`: a signed record exists.
- `location_verified`: a creator-confirmed location event is recorded.
- `device_verified`: capture-device evidence is recorded.
- `witness_verified`: two or more independent, valid witness attestations exist.
- `fully_verified`: device evidence + location evidence + two or more independent witnesses.

"Independent" in the MVP means distinct normalized witness email addresses, none belonging to the creator. This is a policy, not a truth guarantee.

## Primary flows

- Sign up / sign in. Seeded demo and admin accounts.
- Create a draft with claims, participants, uploads, cover, location, and times.
- Upload images, hash them, extract EXIF, chain evidence events, and record device evidence when camera metadata exists.
- Invite a witness for a specific claim; create a single-use 7-day token; log the URL in development and return it to the authenticated creator.
- Witness confirms name and relationship, then signs; the record is resealed and trust recalculated.
- Publish or unpublish. Public verification is available only for public/unlisted records.
- Public verification: status/integrity banner, trust criteria, claims and witness counts, evidence timeline, media hashes, QR code, JSON export, badge and embed snippet.
- Admin desk: flag, unflag, revoke, restore, with append-only audit trail.

## Security / privacy decisions

- Exact coordinates are encrypted; public output never contains exact coordinates.
- Witness email addresses never leave server-side data. Public JSON uses an opaque witness label, relationship, public key, and signature.
- Attestation tokens are stored as SHA-256 hashes and expire after seven days.
- All API mutations enforce same-origin requests in addition to SameSite cookies. Auth.js handles CSRF for its own endpoints.
- Public output is limited to public/unlisted records that have been published or remain publicly visible after flagging/revocation.
- Account and record deletion physically delete data (files are deleted where possible); audit log entries remain and are intentionally immutable.
- Uploads are restricted to JPEG, PNG, and WebP by content signature and size. SVG is rejected to prevent stored XSS.
- Signature language is deliberately modest: a signature establishes record integrity and signer custody, not legal validity.

## Deliberate MVP limits

- Record signing keys and witness keys are held by the server (encrypted at rest). The schema exposes public keys and is ready for creator-held and witness-held key flows later. This limitation is shown in the UI and README.
- There is no external timestamp anchor yet. An `AnchorProvider` interface documents the future seam; no blockchain integration exists.
- No email delivery provider is required. Development invitation links are logged and shown to the signed-in creator.
- Rate limiting is process-local.
- Location is creator-entered or EXIF-derived; it is not independently verified.
- Deletion removes public evidence. Revocation is the durable public signal.

## Verification commands

`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npx playwright test` are expected to pass with PostgreSQL running from Docker Compose.
