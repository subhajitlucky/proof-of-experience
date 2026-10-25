import { describe, expect, it } from "vitest";
import {
  attestationSigningPayload,
  generateEd25519KeyPair,
  getRecordSigningPublicKey,
  publicKeyFromPrivate,
  signBytes,
  signRecordHash,
  signAttestation,
  verifyAttestationSignature,
  verifyBytes,
  verifyRecordHash,
} from "@/lib/keys";

describe("Ed25519 signatures", () => {
  it("signs and verifies bytes, and rejects altered bytes", () => {
    const keys = generateEd25519KeyPair();
    const signature = signBytes("a record payload", keys.privateKey);
    expect(verifyBytes("a record payload", signature, keys.publicKey)).toBe(true);
    expect(verifyBytes("a changed payload", signature, keys.publicKey)).toBe(false);
  });

  it("derives the expected public key from a private key", () => {
    const keys = generateEd25519KeyPair();
    expect(publicKeyFromPrivate(keys.privateKey)).toBe(keys.publicKey);
  });

  it("signs the application's record hash with the configured server key", () => {
    const recordHash = "a".repeat(64);
    const signature = signRecordHash(recordHash);
    expect(verifyRecordHash(recordHash, signature, getRecordSigningPublicKey())).toBe(
      true,
    );
    expect(
      verifyRecordHash("b".repeat(64), signature, getRecordSigningPublicKey()),
    ).toBe(false);
  });

  it("produces and verifies a witness attestation over the required fields", () => {
    const keys = generateEd25519KeyPair();
    const input = {
      claimId: "claim_demo",
      recordHash: "c".repeat(64),
      witnessId: "witness_demo",
      attestedAt: new Date("2026-10-01T09:00:00.000Z"),
    };
    const signature = signAttestation(input, keys.privateKey);
    expect(
      verifyAttestationSignature({
        ...input,
        signature,
        publicKeyBase64: keys.publicKey,
      }),
    ).toBe(true);
    expect(
      verifyAttestationSignature({
        ...input,
        claimId: "claim_other",
        signature,
        publicKeyBase64: keys.publicKey,
      }),
    ).toBe(false);
    expect(attestationSigningPayload(input)).toContain(input.recordHash);
  });
});
