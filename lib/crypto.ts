import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";

export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

export function createOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
  return sha256Hex(token);
}

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120)
    .replace(/^[.-]+/, "");
  return cleaned || "upload";
}

function getEncryptionKey(): Buffer {
  const encoded = process.env.DATA_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("DATA_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

/**
 * AES-256-GCM at the application boundary. Used for exact location data and
 * server-mediated signing keys. The version prefix leaves room for rotation.
 */
export function encryptString(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTION_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptString(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== ENCRYPTION_VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Unsupported encrypted value");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptNumber(value: number): string {
  return encryptString(value.toString());
}

export function decryptNumber(payload: string): number {
  const value = Number(decryptString(payload));
  if (!Number.isFinite(value)) throw new Error("Encrypted number is invalid");
  return value;
}
