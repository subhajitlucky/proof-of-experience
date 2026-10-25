-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('craft', 'travel', 'food', 'art', 'event', 'other');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('private', 'unlisted', 'public');

-- CreateEnum
CREATE TYPE "ExperienceStatus" AS ENUM ('draft', 'evidence_pending', 'witness_verified', 'published', 'flagged', 'revoked');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('self_attested', 'location_verified', 'device_verified', 'witness_verified', 'fully_verified');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('record_created', 'media_uploaded', 'location_confirmed', 'device_attested', 'witness_invited', 'witness_attested', 'published', 'unpublished', 'flagged', 'revoked', 'restored');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('flag', 'unflag', 'revoke', 'restore');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "handle" VARCHAR(40) NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "locationName" VARCHAR(160) NOT NULL,
    "latitudeEnc" TEXT,
    "longitudeEnc" TEXT,
    "showExactLocation" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "status" "ExperienceStatus" NOT NULL DEFAULT 'draft',
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'self_attested',
    "recordHash" VARCHAR(64),
    "signature" TEXT,
    "publicKey" TEXT,
    "signedAt" TIMESTAMP(3),
    "sealedVersion" INTEGER NOT NULL DEFAULT 0,
    "locationConfirmedAt" TIMESTAMP(3),
    "deviceAttestedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "flaggedAt" TIMESTAMP(3),
    "flagReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "capturedAt" TIMESTAMP(3),
    "exif" JSONB,
    "gpsPresent" BOOLEAN NOT NULL DEFAULT false,
    "latitudeEnc" TEXT,
    "longitudeEnc" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "role" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Witness" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "invitedName" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "normalizedEmail" VARCHAR(254) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "witnessId" TEXT NOT NULL,
    "confirmedName" VARCHAR(120) NOT NULL,
    "relationship" VARCHAR(200) NOT NULL,
    "witnessPublicKey" TEXT NOT NULL,
    "signedRecordHash" VARCHAR(64) NOT NULL,
    "signature" TEXT NOT NULL,
    "attestedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceEvent" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "actorId" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "previousHash" VARCHAR(64),
    "eventHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" VARCHAR(64) NOT NULL,
    "actorName" VARCHAR(120) NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" VARCHAR(40) NOT NULL,
    "targetId" VARCHAR(64) NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");

-- CreateIndex
CREATE INDEX "Experience_creatorId_updatedAt_idx" ON "Experience"("creatorId", "updatedAt");

-- CreateIndex
CREATE INDEX "Experience_status_visibility_idx" ON "Experience"("status", "visibility");

-- CreateIndex
CREATE INDEX "Experience_isDemo_publishedAt_idx" ON "Experience"("isDemo", "publishedAt");

-- CreateIndex
CREATE INDEX "Claim_experienceId_idx" ON "Claim"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_experienceId_position_key" ON "Claim"("experienceId", "position");

-- CreateIndex
CREATE INDEX "MediaAsset_experienceId_idx" ON "MediaAsset"("experienceId");

-- CreateIndex
CREATE INDEX "Participant_experienceId_idx" ON "Participant"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_experienceId_position_key" ON "Participant"("experienceId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Witness_tokenHash_key" ON "Witness"("tokenHash");

-- CreateIndex
CREATE INDEX "Witness_experienceId_normalizedEmail_idx" ON "Witness"("experienceId", "normalizedEmail");

-- CreateIndex
CREATE INDEX "Witness_tokenExpiresAt_idx" ON "Witness"("tokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Witness_experienceId_normalizedEmail_claimId_key" ON "Witness"("experienceId", "normalizedEmail", "claimId");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_witnessId_key" ON "Attestation"("witnessId");

-- CreateIndex
CREATE INDEX "Attestation_experienceId_idx" ON "Attestation"("experienceId");

-- CreateIndex
CREATE INDEX "Attestation_claimId_idx" ON "Attestation"("claimId");

-- CreateIndex
CREATE INDEX "EvidenceEvent_experienceId_sequence_idx" ON "EvidenceEvent"("experienceId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceEvent_experienceId_sequence_key" ON "EvidenceEvent"("experienceId", "sequence");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_witnessId_fkey" FOREIGN KEY ("witnessId") REFERENCES "Witness"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceEvent" ADD CONSTRAINT "EvidenceEvent_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
