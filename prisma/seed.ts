import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Category } from "@prisma/client";
import { prisma } from "../lib/db";
import {
  encryptString,
} from "../lib/crypto";
import { generateEd25519KeyPair } from "../lib/keys";
import { prepareImageBuffer } from "../lib/media";
import { deleteStoredFiles } from "../lib/storage";
import {
  addExperienceEvidence,
  createExperience,
  setPublishState,
} from "../lib/services/experiences";
import { inviteWitness, submitAttestation } from "../lib/services/witnesses";
import type { CreateExperienceServiceInput } from "../lib/services/experiences";

const DEMO_SLUGS = [
  "demo-kyoto-raku",
  "demo-copenhagen-winter-table",
  "demo-okavango-wild-dogs",
];

const MAIN_DEMO_EMAIL = "demo@proofofexperience.local";
const ADMIN_EMAIL = "admin@proofofexperience.local";
const DEMO_PASSWORD = "demo1234";
const ADMIN_PASSWORD = "admin1234";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error(
    "Refusing to seed demo credentials in production. Set ALLOW_DEMO_SEED=true if this is intentional.",
  );
}

async function upsertDemoUser(input: {
  name: string;
  email: string;
  handle: string;
  bio: string;
  password: string;
  role: "user" | "admin";
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const keys = generateEd25519KeyPair();
  const data = {
    name: input.name,
    handle: input.handle,
    bio: input.bio,
    passwordHash,
    role: input.role,
    publicKey: keys.publicKey,
    encryptedPrivateKey: encryptString(keys.privateKey),
  };
  return prisma.user.upsert({
    where: { email: input.email },
    update: data,
    create: { email: input.email, ...data },
  });
}

async function removePriorSeedData() {
  const existing = await prisma.experience.findMany({
    where: {
      OR: [{ isDemo: true }, { slug: { in: DEMO_SLUGS } }],
    },
    select: {
      id: true,
      media: { select: { storageKey: true } },
    },
  });
  if (existing.length > 0) {
    const keys = existing.flatMap((record) =>
      record.media.map((asset) => asset.storageKey),
    );
    await prisma.experience.deleteMany({
      where: { id: { in: existing.map((record) => record.id) } },
    });
    await deleteStoredFiles(keys);
  }
}

async function demoImage(fileName: string, capturedAt: Date) {
  const bytes = await readFile(
    path.join(process.cwd(), "prisma", "seed-assets", fileName),
  );
  return prepareImageBuffer({
    buffer: bytes,
    fileName,
    fallbackCapturedAt: capturedAt,
    isCover: true,
  });
}

async function createDemoRecord(input: {
  creatorId: string;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  locationName: string;
  latitude: number;
  longitude: number;
  startAt: Date;
  endAt: Date;
  image: Awaited<ReturnType<typeof demoImage>>;
  claims: Array<{ text: string; evidence?: string }>;
  participants?: Array<{ name: string; role: string; email?: string }>;
  witnesses: Array<{
    name: string;
    email: string;
    relationship: string;
    claimIndex: number;
  }>;
  deviceEvidence: boolean;
}) {
  const createInput: CreateExperienceServiceInput = {
    title: input.title,
    summary: input.summary,
    category: input.category,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    startAt: input.startAt,
    endAt: input.endAt,
    visibility: "public",
    showExactLocation: false,
    confirmLocation: true,
    claims: input.claims.map((claim) => ({
      text: claim.text,
      evidence: claim.evidence,
    })),
    participants: input.participants ?? [],
    images: [input.image],
    coverIndex: 0,
  };

  const record = await createExperience(input.creatorId, createInput);
  await prisma.experience.update({
    where: { id: record.id },
    data: { slug: input.slug, isDemo: true },
  });

  if (input.deviceEvidence) {
    await addExperienceEvidence(record.id, input.creatorId, {
      type: "device_attested",
      note: "Demo: capture-device context recorded for this fictional record.",
    });
  }

  const claims = await prisma.claim.findMany({
    where: { experienceId: record.id },
    orderBy: { position: "asc" },
  });

  for (const witnessInput of input.witnesses) {
    const claim = claims[witnessInput.claimIndex];
    if (!claim) throw new Error("Seed witness references a missing claim");
    const invite = await inviteWitness(record.id, input.creatorId, {
      claimId: claim.id,
      name: witnessInput.name,
      email: witnessInput.email,
    });
    const token = new URL(invite.attestationUrl).pathname.split("/").pop();
    if (!token) throw new Error("Seed invitation did not produce a token");
    await submitAttestation(token, {
      name: witnessInput.name,
      relationship: witnessInput.relationship,
      confirmName: true,
      confirmRelationship: true,
    });
  }

  await setPublishState(record.id, input.creatorId, "publish");

  return prisma.experience.findUniqueOrThrow({
    where: { id: record.id },
    select: {
      id: true,
      title: true,
      slug: true,
      trustLevel: true,
      status: true,
      recordHash: true,
      sealedVersion: true,
    },
  });
}

async function main() {
  await removePriorSeedData();

  const demo = await upsertDemoUser({
    name: "Aiko Mori",
    email: MAIN_DEMO_EMAIL,
    handle: "aiko-mori",
    bio: "Demo profile. A fictional Kyoto ceramicist. This account owns one clearly labelled demo record for product evaluation.",
    password: DEMO_PASSWORD,
    role: "user",
  });
  const admin = await upsertDemoUser({
    name: "Registry Desk",
    email: ADMIN_EMAIL,
    handle: "registry-desk",
    bio: "Demo administrator account for Proof of Experience. All records are fictional.",
    password: ADMIN_PASSWORD,
    role: "admin",
  });
  const chef = await upsertDemoUser({
    name: "Freja Lind",
    email: "freja.lind@demo.proofofexperience.local",
    handle: "freja-lind",
    bio: "Demo profile. Fictional Copenhagen chef.",
    password: "demo-chef-only",
    role: "user",
  });
  const guide = await upsertDemoUser({
    name: "Kabelo Mose",
    email: "kabelo.mose@demo.proofofexperience.local",
    handle: "kabelo-mose",
    bio: "Demo profile. Fictional Okavango wildlife guide.",
    password: "demo-guide-only",
    role: "user",
  });

  console.info("Seeding demo images and signed records. This takes a few seconds...");

  const [kyotoImage, copenhagenImage, okavangoImage] = await Promise.all([
    demoImage("kyoto-raku.png", new Date("2026-03-08T10:20:00.000Z")),
    demoImage("copenhagen-table.png", new Date("2026-02-14T18:05:00.000Z")),
    demoImage("okavango-wild-dogs.png", new Date("2026-07-11T06:40:00.000Z")),
  ]);

  const kyoto = await createDemoRecord({
    creatorId: demo.id,
    slug: "demo-kyoto-raku",
    title: "The eleventh firing: raku tea bowls in Kyoto",
    summary:
      "A demo record documenting eleven days of throwing, glazing, and firing tea bowls in a small Kyoto studio. The record includes studio photographs, two claims, and two independent witness attestations. Aiko Mori is a fictional creator.",
    category: "craft",
    locationName: "Kyoto, Japan",
    latitude: 35.0116,
    longitude: 135.7681,
    startAt: new Date("2026-03-04T09:00:00.000Z"),
    endAt: new Date("2026-03-15T17:00:00.000Z"),
    image: kyotoImage,
    deviceEvidence: true,
    claims: [
      {
        text: "I shaped and fired the tea bowls in this series in my Kyoto studio over eleven days in March 2026.",
        evidence:
          "Studio work notes, a kiln log signed by the studio assistant, and the dated cover photograph.",
      },
      {
        text: "Each bowl in this set was coated with a raku glaze developed from ash gathered at my workshop.",
        evidence:
          "Glaze batch notes listing ash, feldspar, and local clay sources.",
      },
    ],
    participants: [
      {
        name: "Nao Fujimoto",
        role: "Studio assistant",
        email: "nao.fujimoto@example.com",
      },
    ],
    witnesses: [
      {
        name: "Leah Morgan",
        email: "leah.morgan@example.com",
        relationship: "Collector who commissioned the series",
        claimIndex: 0,
      },
      {
        name: "Kenji Arata",
        email: "kenji.arata@example.com",
        relationship: "Fellow ceramicist in the same kiln programme",
        claimIndex: 0,
      },
    ],
  });

  const copenhagen = await createDemoRecord({
    creatorId: chef.id,
    slug: "demo-copenhagen-winter-table",
    title: "A winter table for eight, Copenhagen",
    summary:
      "A demo record for an eight-seat winter tasting menu, documented through a dated table photograph, supplier relationships, and two independent witness attestations. Freja Lind is a fictional chef.",
    category: "food",
    locationName: "Copenhagen, Denmark",
    latitude: 55.6761,
    longitude: 12.5683,
    startAt: new Date("2026-02-14T17:30:00.000Z"),
    endAt: new Date("2026-02-14T23:15:00.000Z"),
    image: copenhagenImage,
    deviceEvidence: false,
    claims: [
      {
        text: "I designed, cooked, and served this eight-seat winter menu in Copenhagen on 14 February 2026.",
        evidence:
          "Menu card, prep list, and supplier delivery note attached to the working file.",
      },
      {
        text: "The menu used produce delivered that week by three independent farms in Zealand and Scania.",
        evidence:
          "Three supplier notes with dates and produce lines; contact details withheld.",
      },
    ],
    participants: [
      { name: "Mette Sørensen", role: "Pastry cook" },
      { name: "Jonas Bager", role: "Service lead" },
    ],
    witnesses: [
      {
        name: "Søren Vestergaard",
        email: "soren.vestergaard@example.com",
        relationship: "Weekly produce supplier",
        claimIndex: 0,
      },
      {
        name: "Mina Holm",
        email: "mina.holm@example.com",
        relationship: "Dining guest at the recorded service",
        claimIndex: 1,
      },
    ],
  });

  const okavango = await createDemoRecord({
    creatorId: guide.id,
    slug: "demo-okavango-wild-dogs",
    title: "Ten days tracking wild dogs in the Okavango",
    summary:
      "A demo field record from ten days following a wild dog pack in the Okavango Delta. The record contains field claims, a dated image plate, and two independent witness attestations. Kabelo Mose is a fictional guide.",
    category: "travel",
    locationName: "Okavango Delta, Botswana",
    latitude: -19.35,
    longitude: 22.82,
    startAt: new Date("2026-07-04T06:00:00.000Z"),
    endAt: new Date("2026-07-14T16:00:00.000Z"),
    image: okavangoImage,
    deviceEvidence: true,
    claims: [
      {
        text: "I guided a ten-day wild dog tracking expedition in the Okavango Delta from 4 to 14 July 2026.",
        evidence:
          "Daily field log, route notes, and camp register extracts with guest names removed.",
      },
      {
        text: "The pack was observed on at least six separate mornings without baiting or artificial calls.",
        evidence:
          "Dated observation notes showing location, time, pack count, and weather.",
      },
    ],
    participants: [
      { name: "Naledi Kgosi", role: "Conservation field researcher" },
    ],
    witnesses: [
      {
        name: "Naledi Kgosi",
        email: "naledi.kgosi@example.com",
        relationship: "Field researcher present for the observation window",
        claimIndex: 0,
      },
      {
        name: "Tomás Ferreira",
        email: "tomas.ferreira@example.com",
        relationship: "Guest on the recorded expedition",
        claimIndex: 0,
      },
    ],
  });

  console.info("\nDemo records ready:");
  for (const record of [kyoto, copenhagen, okavango]) {
    console.info(
      `  /verify/${record.slug} — ${record.trustLevel} (sealed v${record.sealedVersion})`,
    );
  }
  console.info("\nDemo credentials:");
  console.info(`  Creator: ${MAIN_DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.info(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.info(`  Admin user id: ${admin.id}`);
  console.info("\nAll people, records, and events above are fictional demo data.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
