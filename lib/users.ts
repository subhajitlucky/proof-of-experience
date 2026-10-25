import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { encryptString } from "./crypto";
import { generateEd25519KeyPair } from "./keys";
import { normalizeEmail } from "./crypto";

function generateHandleBase(name: string, email: string): string {
  const fromName = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  if (fromName.length >= 3) return fromName;
  const fromEmail = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return fromEmail.slice(0, 24) || "witness";
}

async function uniqueHandle(base: string): Promise<string> {
  let candidate = base.slice(0, 30).replace(/^-+|-+$/g, "") || "creator";
  if (candidate.length < 3) candidate = `${candidate}-creator`;
  let suffix = 0;
  while (suffix < 100) {
    const handle = suffix === 0 ? candidate : `${candidate.slice(0, 27)}-${suffix}`;
    const existing = await prisma.user.findUnique({
      where: { handle },
      select: { id: true },
    });
    if (!existing) return handle;
    suffix += 1;
  }
  return `${candidate.slice(0, 23)}-${Date.now().toString(36)}`;
}

export async function createCredentialUser(input: {
  name: string;
  email: string;
  handle: string;
  password: string;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const keys = generateEd25519KeyPair();
  return prisma.user.create({
    data: {
      name: input.name,
      email,
      handle: input.handle,
      passwordHash,
      publicKey: keys.publicKey,
      encryptedPrivateKey: encryptString(keys.privateKey),
    },
  });
}

export async function ensureOAuthUser(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const name = (input.name?.trim() || email.split("@")[0]).slice(0, 120);
  const handle = await uniqueHandle(generateHandleBase(name, email));
  const keys = generateEd25519KeyPair();
  const avatarUrl =
    input.image && /^https?:\/\//i.test(input.image) ? input.image.slice(0, 1000) : null;

  return prisma.user.create({
    data: {
      name,
      email,
      handle,
      avatarUrl,
      passwordHash: null,
      publicKey: keys.publicKey,
      encryptedPrivateKey: encryptString(keys.privateKey),
    },
  });
}

export async function verifyCredentials(
  emailInput: string,
  password: string,
): Promise<User | null> {
  const email = normalizeEmail(emailInput);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name: string;
    handle: string;
    bio?: string;
    avatarUrl?: string;
  },
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      handle: input.handle,
      bio: input.bio ?? null,
      avatarUrl: input.avatarUrl ?? null,
    },
  });
}

export async function deleteAccountAndData(userId: string): Promise<void> {
  const experiences = await prisma.experience.findMany({
    where: { creatorId: userId },
    select: { media: { select: { storageKey: true } } },
  });
  const keys = experiences.flatMap((experience) =>
    experience.media.map((asset) => asset.storageKey),
  );
  await prisma.user.delete({ where: { id: userId } });
  const { deleteStoredFiles } = await import("./storage");
  await deleteStoredFiles(keys);
}
