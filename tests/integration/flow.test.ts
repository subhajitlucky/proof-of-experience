import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { decryptNumber } from "@/lib/crypto";
import { prepareImageBuffer } from "@/lib/media";
import { createCredentialUser } from "@/lib/users";
import {
  addExperienceEvidence,
  createExperience,
  setPublishState,
} from "@/lib/services/experiences";
import {
  getInvitation,
  inviteWitness,
  submitAttestation,
} from "@/lib/services/witnesses";
import { getPublicVerification } from "@/lib/services/public-verification";
import { deleteStoredFiles } from "@/lib/storage";

const suffix = randomBytes(5).toString("hex");
const creatorEmail = `creator.${suffix}@example.com`;
const witnessOneEmail = `witness.one.${suffix}@example.com`;
const witnessTwoEmail = `witness.two.${suffix}@example.com`;

let userId: string | null = null;

const testImage = await readFile(
  path.join(process.cwd(), "tests", "fixtures", "print-studio.png"),
);

function tokenFromInvitation(url: string): string {
  const token = new URL(url).pathname.split("/").pop();
  if (!token) throw new Error("Invitation had no token");
  return token;
}

afterAll(async () => {
  if (!userId) {
    await prisma.$disconnect();
    return;
  }
  const experiences = await prisma.experience.findMany({
    where: { creatorId: userId },
    select: { media: { select: { storageKey: true } } },
  });
  const storageKeys = experiences.flatMap((experience) =>
    experience.media.map((asset) => asset.storageKey),
  );
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await deleteStoredFiles(storageKeys);
  userId = null;
  await prisma.$disconnect();
});

it("runs create → invite → attest → publish → verify and detects every content change", async () => {
  const user = await createCredentialUser({
    name: "Integration Creator",
    email: creatorEmail,
    handle: `int-${suffix}`,
    password: "integration-pass-123",
  });
  userId = user.id;

  const image = await prepareImageBuffer({
    buffer: testImage,
    fileName: "print-studio.png",
    declaredMimeType: "image/png",
    fallbackCapturedAt: new Date("2026-10-01T09:00:00.000Z"),
    isCover: true,
  });
  expect(image.data.sha256).toHaveLength(64);

  const created = await createExperience(user.id, {
    title: "Integration test record",
    summary:
      "A database-backed integration record used to exercise evidence, invitation, attestation, publication and verification.",
    category: "craft",
    locationName: "Bristol, United Kingdom",
    latitude: 51.4545,
    longitude: -2.5879,
    startAt: new Date("2026-10-01T09:00:00.000Z"),
    endAt: new Date("2026-10-01T13:00:00.000Z"),
    visibility: "public",
    showExactLocation: false,
    confirmLocation: true,
    claims: [
      {
        text: "I printed and editioned six woodblock prints at the studio on 1 October 2026.",
        evidence: "Signed studio work log.",
      },
      {
        text: "The inks used for the edition were mixed by hand from pigment and linseed oil.",
      },
    ],
    participants: [
      { name: "Studio Assistant", role: "Print assistant", email: "assistant@example.com" },
    ],
    images: [image],
    coverIndex: 0,
  });

  const draft = await prisma.experience.findUniqueOrThrow({
    where: { id: created.id },
    include: { media: true, claims: { orderBy: { position: "asc" } } },
  });
  expect(draft.status).toBe("draft");
  expect(draft.recordHash).toBeNull();
  expect(draft.latitudeEnc).toMatch(/^v1:/);
  expect(draft.latitudeEnc).not.toContain("51.4545");
  expect(decryptNumber(draft.latitudeEnc as string)).toBeCloseTo(51.4545, 4);
  expect(draft.media[0]?.sha256).toBe(image.data.sha256);

  await addExperienceEvidence(created.id, user.id, {
    type: "device_attested",
    note: "Integration test device context.",
  });

  const claimOne = draft.claims[0];
  const claimTwo = draft.claims[1];
  expect(claimOne).toBeDefined();
  expect(claimTwo).toBeDefined();

  const firstInvite = await inviteWitness(created.id, user.id, {
    claimId: claimOne!.id,
    name: "Leah Integration",
    email: witnessOneEmail,
  });
  const tokenOne = tokenFromInvitation(firstInvite.attestationUrl);

  const invitationView = await getInvitation(tokenOne);
  expect(invitationView.state).toBe("pending");
  if (invitationView.state === "pending") {
    expect(invitationView.claim.text).toContain("woodblock prints");
    expect(invitationView.record.title).toBe("Integration test record");
  }

  await submitAttestation(tokenOne, {
    name: "Leah Integration",
    relationship: "Collector who commissioned the print edition",
    confirmName: true,
    confirmRelationship: true,
  });

  await expect(
    submitAttestation(tokenOne, {
      name: "Leah Integration",
      relationship: "Collector who commissioned the print edition",
      confirmName: true,
      confirmRelationship: true,
    }),
  ).rejects.toMatchObject({ status: 410 });

  const secondInvite = await inviteWitness(created.id, user.id, {
    claimId: claimTwo!.id,
    name: "Kenji Integration",
    email: witnessTwoEmail,
  });
  const tokenTwo = tokenFromInvitation(secondInvite.attestationUrl);
  await submitAttestation(tokenTwo, {
    name: "Kenji Integration",
    relationship: "Fellow printmaker present in the studio",
    confirmName: true,
    confirmRelationship: true,
  });

  const prePublication = await prisma.experience.findUniqueOrThrow({
    where: { id: created.id },
    include: { attestations: true },
  });
  expect(prePublication.status).toBe("witness_verified");
  expect(prePublication.attestations).toHaveLength(2);
  expect(prePublication.recordHash).toHaveLength(64);
  expect(prePublication.signature).toBeTruthy();

  await setPublishState(created.id, user.id, "publish");

  const published = await prisma.experience.findUniqueOrThrow({
    where: { id: created.id },
    include: { media: true, attestations: true, claims: { orderBy: { position: "asc" } } },
  });
  expect(published.status).toBe("published");
  expect(published.visibility).toBe("public");
  expect(published.publishedAt).not.toBeNull();
  expect(published.media[0]?.sha256).toBe(image.data.sha256);

  const verification = await getPublicVerification(created.slug);
  expect(verification).not.toBeNull();
  const document = verification!.document;
  expect(document.integrity.state).toBe("valid");
  expect(document.integrity.altered).toBe(false);
  expect(document.integrity.checks.recordHashMatches).toBe(true);
  expect(document.integrity.checks.signatureValid).toBe(true);
  expect(document.integrity.checks.evidenceChainValid).toBe(true);
  expect(document.integrity.checks.attestationSignaturesValid).toBe(true);
  expect(document.trust.level).toBe("fully_verified");
  expect(document.trust.witnessCount).toBe(2);
  expect(document.claims).toHaveLength(2);
  expect(document.claims.map((claim) => claim.witnessCount)).toEqual([1, 1]);
  expect(document.evidenceEvents.map((event) => event.type)).toEqual(
    expect.arrayContaining([
      "record_created",
      "media_uploaded",
      "location_confirmed",
      "device_attested",
      "witness_invited",
      "witness_attested",
      "published",
    ]),
  );
  expect(document.integrity.recordHash).toHaveLength(64);

  const publicJson = JSON.stringify(document);
  for (const secret of [
    witnessOneEmail,
    witnessTwoEmail,
    creatorEmail,
    "Leah Integration",
    "Kenji Integration",
    "51.4545",
    "-2.5879",
    "assistant@example.com",
  ]) {
    expect(publicJson).not.toContain(secret);
  }
  expect(document.privacy.exactCoordinatesIncluded).toBe(false);
  expect(document.privacy.witnessEmailsIncluded).toBe(false);

  // Tamper with a claim. The existing signature and hash must not match.
  const originalClaim = claimOne!.text;
  await prisma.claim.update({
    where: { id: claimOne!.id },
    data: { text: "Changed after sealing" },
  });
  let altered = await getPublicVerification(created.slug);
  expect(altered?.document.integrity.altered).toBe(true);
  expect(altered?.document.integrity.checks.recordHashMatches).toBe(false);

  await prisma.claim.update({
    where: { id: claimOne!.id },
    data: { text: originalClaim },
  });
  let restored = await getPublicVerification(created.slug);
  expect(restored?.document.integrity.altered).toBe(false);

  // Tamper with a media hash.
  const originalSha = image.data.sha256;
  await prisma.mediaAsset.update({
    where: { id: published.media[0]!.id },
    data: { sha256: "f".repeat(64) },
  });
  altered = await getPublicVerification(created.slug);
  expect(altered?.document.integrity.altered).toBe(true);
  await prisma.mediaAsset.update({
    where: { id: published.media[0]!.id },
    data: { sha256: originalSha },
  });
  restored = await getPublicVerification(created.slug);
  expect(restored?.document.integrity.altered).toBe(false);

  // Tamper with an attestation.
  const originalRelationship = published.attestations[0]!.relationship;
  await prisma.attestation.update({
    where: { id: published.attestations[0]!.id },
    data: { relationship: "Changed relationship" },
  });
  altered = await getPublicVerification(created.slug);
  expect(altered?.document.integrity.altered).toBe(true);
  await prisma.attestation.update({
    where: { id: published.attestations[0]!.id },
    data: { relationship: originalRelationship },
  });
  restored = await getPublicVerification(created.slug);
  expect(restored?.document.integrity.altered).toBe(false);
});
