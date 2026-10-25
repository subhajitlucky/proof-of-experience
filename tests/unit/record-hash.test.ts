import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/lib/canonical";
import { sha256Hex } from "@/lib/crypto";
import { buildRecordPayload, type FullExperience } from "@/lib/record";

function fixture(): FullExperience {
  return {
    id: "exp_1",
    creatorId: "user_1",
    slug: "record-one",
    title: "A signed record",
    summary: "A record used to prove that canonical hashing is sensitive to content.",
    category: "craft",
    locationName: "Kyoto, Japan",
    latitudeEnc: null,
    longitudeEnc: null,
    showExactLocation: false,
    startAt: new Date("2026-03-01T09:00:00.000Z"),
    endAt: new Date("2026-03-02T09:00:00.000Z"),
    visibility: "public",
    status: "published",
    trustLevel: "witness_verified",
    recordHash: "a".repeat(64),
    signature: "signature",
    publicKey: "public-key",
    signedAt: new Date("2026-03-03T09:00:00.000Z"),
    sealedVersion: 1,
    locationConfirmedAt: new Date("2026-03-01T09:00:00.000Z"),
    deviceAttestedAt: null,
    publishedAt: new Date("2026-03-03T09:00:00.000Z"),
    flaggedAt: null,
    flagReason: null,
    revokedAt: null,
    isDemo: false,
    createdAt: new Date("2026-03-01T09:00:00.000Z"),
    updatedAt: new Date("2026-03-03T09:00:00.000Z"),
    claims: [
      {
        id: "claim_1",
        experienceId: "exp_1",
        position: 1,
        text: "The claim text",
        evidence: "Kiln log",
        createdAt: new Date("2026-03-01T09:00:00.000Z"),
        updatedAt: new Date("2026-03-01T09:00:00.000Z"),
      },
    ],
    media: [
      {
        id: "media_1",
        experienceId: "exp_1",
        storageKey: "media/one.jpg",
        fileName: "one.jpg",
        mimeType: "image/jpeg",
        size: 1234,
        sha256: "b".repeat(64),
        capturedAt: new Date("2026-03-01T09:00:00.000Z"),
        exif: { cameraMake: "Demo Camera" },
        gpsPresent: false,
        latitudeEnc: null,
        longitudeEnc: null,
        isCover: true,
        createdAt: new Date("2026-03-01T09:00:00.000Z"),
        updatedAt: new Date("2026-03-01T09:00:00.000Z"),
      },
    ],
    participants: [
      {
        id: "participant_1",
        experienceId: "exp_1",
        position: 1,
        name: "A Person",
        role: "Assistant",
        email: "private@example.com",
        createdAt: new Date("2026-03-01T09:00:00.000Z"),
        updatedAt: new Date("2026-03-01T09:00:00.000Z"),
      },
    ],
    witnesses: [],
    attestations: [
      {
        id: "attestation_1",
        experienceId: "exp_1",
        claimId: "claim_1",
        witnessId: "witness_1",
        confirmedName: "Private Witness",
        relationship: "Studio peer",
        witnessPublicKey: "witness-public-key",
        signedRecordHash: "a".repeat(64),
        signature: "attestation-signature",
        attestedAt: new Date("2026-03-02T09:00:00.000Z"),
        createdAt: new Date("2026-03-02T09:00:00.000Z"),
        witness: {
          id: "witness_1",
          email: "witness@example.com",
          normalizedEmail: "witness@example.com",
          invitedName: "Private Witness",
        },
      },
    ],
    evidenceEvents: [],
    creator: {
      id: "user_1",
      name: "Creator",
      email: "creator@example.com",
      handle: "creator",
      avatarUrl: null,
      publicKey: "creator-public-key",
    },
  } as FullExperience;
}

function hashOf(experience: FullExperience): string {
  return sha256Hex(canonicalJson(buildRecordPayload(experience)));
}

describe("record hashing", () => {
  it("changes when a claim changes", () => {
    const experience = fixture();
    const original = hashOf(experience);
    experience.claims[0].text = "A changed claim";
    expect(hashOf(experience)).not.toBe(original);
  });

  it("changes when a media hash changes", () => {
    const experience = fixture();
    const original = hashOf(experience);
    experience.media[0].sha256 = "c".repeat(64);
    expect(hashOf(experience)).not.toBe(original);
  });

  it("changes when witness attestation data changes", () => {
    const experience = fixture();
    const original = hashOf(experience);
    experience.attestations[0].relationship = "A different relationship";
    expect(hashOf(experience)).not.toBe(original);
  });

  it("does not expose private witness names, emails or signatures in the canonical payload", () => {
    const experience = fixture();
    const payload = JSON.stringify(buildRecordPayload(experience));
    expect(payload).not.toContain("witness@example.com");
    expect(payload).not.toContain("Private Witness");
    expect(payload).not.toContain("attestation-signature");
    expect(payload).not.toContain("private@example.com");
  });
});
