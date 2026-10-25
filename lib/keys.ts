import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { canonicalJson } from "./canonical";

export interface KeyPairMaterial {
  privateKey: string;
  publicKey: string;
}

interface CachedSigningKey {
  source: string;
  privateKey: KeyObject;
  publicKeyBase64: string;
}

let cachedSigningKey: CachedSigningKey | null = null;

function exportPublicKey(key: KeyObject): string {
  return key.export({ format: "der", type: "spki" }).toString("base64");
}

function importPrivateKey(encoded: string): KeyObject {
  return createPrivateKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

function importPublicKey(encoded: string): KeyObject {
  return createPublicKey({
    key: Buffer.from(encoded, "base64"),
    format: "der",
    type: "spki",
  });
}

/** Server-held record signing identity. Keys are Ed25519 and stored as SPKI/DER. */
export function getRecordSigningKey() {
  const source = process.env.RECORD_SIGNING_PRIVATE_KEY;
  if (!source) {
    throw new Error(
      "RECORD_SIGNING_PRIVATE_KEY is not configured. Run `npm run keys:generate`.",
    );
  }
  if (cachedSigningKey?.source === source) return cachedSigningKey;

  const privateKey = importPrivateKey(source);
  if (privateKey.asymmetricKeyType !== "ed25519") {
    throw new Error("RECORD_SIGNING_PRIVATE_KEY must be an Ed25519 PKCS#8 key");
  }
  const publicKeyBase64 = exportPublicKey(createPublicKey(privateKey));
  cachedSigningKey = { source, privateKey, publicKeyBase64 };
  return cachedSigningKey;
}

export function getRecordSigningPublicKey(): string {
  return getRecordSigningKey().publicKeyBase64;
}

export function signRecordHash(recordHash: string): string {
  const key = getRecordSigningKey().privateKey;
  return sign(null, Buffer.from(recordHash, "utf8"), key).toString("base64");
}

export function verifyRecordHash(
  recordHash: string,
  signature: string,
  publicKeyBase64: string,
): boolean {
  try {
    return verify(
      null,
      Buffer.from(recordHash, "utf8"),
      importPublicKey(publicKeyBase64),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function generateEd25519KeyPair(): KeyPairMaterial {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privateKey: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
    publicKey: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
  };
}

export function publicKeyFromPrivate(privateKeyBase64: string): string {
  const privateKey = importPrivateKey(privateKeyBase64);
  return exportPublicKey(createPublicKey(privateKey));
}

export function signBytes(
  payload: string,
  privateKeyBase64: string,
): string {
  return sign(
    null,
    Buffer.from(payload, "utf8"),
    importPrivateKey(privateKeyBase64),
  ).toString("base64");
}

export function verifyBytes(
  payload: string,
  signature: string,
  publicKeyBase64: string,
): boolean {
  try {
    return verify(
      null,
      Buffer.from(payload, "utf8"),
      importPublicKey(publicKeyBase64),
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

/**
 * The exact bytes a witness signs. This domain-separated structure includes
 * every element required by the witness attestation model.
 */
export function attestationSigningPayload(input: {
  claimId: string;
  recordHash: string;
  witnessId: string;
  attestedAt: Date | string;
}): string {
  return canonicalJson({
    type: "proof-of-experience/witness-attestation@1",
    claimId: input.claimId,
    recordHash: input.recordHash,
    witnessId: input.witnessId,
    timestamp:
      input.attestedAt instanceof Date
        ? input.attestedAt.toISOString()
        : new Date(input.attestedAt).toISOString(),
  });
}

export function signAttestation(
  input: {
    claimId: string;
    recordHash: string;
    witnessId: string;
    attestedAt: Date | string;
  },
  privateKeyBase64: string,
): string {
  return signBytes(attestationSigningPayload(input), privateKeyBase64);
}

export function verifyAttestationSignature(input: {
  claimId: string;
  recordHash: string;
  witnessId: string;
  attestedAt: Date | string;
  signature: string;
  publicKeyBase64: string;
}): boolean {
  return verifyBytes(
    attestationSigningPayload(input),
    input.signature,
    input.publicKeyBase64,
  );
}
