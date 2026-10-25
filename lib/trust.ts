import type { TrustLevel } from "@prisma/client";

export interface TrustInput {
  signed: boolean;
  locationConfirmed: boolean;
  deviceAttested: boolean;
  independentWitnesses: number;
}

export interface TrustCriterion {
  key: "signed" | "location" | "device" | "witnesses" | "full";
  label: string;
  detail: string;
  met: boolean;
}

export interface TrustResult {
  level: TrustLevel;
  label: string;
  criteria: TrustCriterion[];
}

export const TRUST_LABELS: Record<TrustLevel, string> = {
  self_attested: "Self-attested",
  location_verified: "Location verified",
  device_verified: "Device verified",
  witness_verified: "Witness verified",
  fully_verified: "Fully verified",
};

export function calculateTrust(input: TrustInput): TrustResult {
  const witnessReady = input.independentWitnesses >= 2;
  const fullyReady = witnessReady && input.locationConfirmed && input.deviceAttested;

  let level: TrustLevel = "self_attested";
  if (!input.signed) {
    // Location and device events cannot lift an unsigned draft into a trust
    // level that would imply a sealed record exists.
    level = "self_attested";
  } else if (fullyReady) {
    level = "fully_verified";
  } else if (witnessReady) {
    level = "witness_verified";
  } else if (input.deviceAttested) {
    level = "device_verified";
  } else if (input.locationConfirmed) {
    level = "location_verified";
  }

  return {
    level,
    label: TRUST_LABELS[level],
    criteria: [
      {
        key: "signed",
        label: "Record sealed",
        detail: "The record has a canonical SHA-256 hash and a server-held Ed25519 signature.",
        met: input.signed,
      },
      {
        key: "location",
        label: "Location confirmed",
        detail: "A location-confirmed evidence event exists. This is creator-supplied context, not independent geolocation.",
        met: input.locationConfirmed,
      },
      {
        key: "device",
        label: "Device context",
        detail: "Capture-device metadata or a creator device attestation exists. It is evidence context, not proof of authorship.",
        met: input.deviceAttested,
      },
      {
        key: "witnesses",
        label: "Two independent witnesses",
        detail: `${input.independentWitnesses} distinct witness${
          input.independentWitnesses === 1 ? "" : "es"
        } with valid signatures. Witnesses must use different email addresses and cannot be the creator.`,
        met: witnessReady,
      },
      {
        key: "full",
        label: "Fully verified",
        detail: "Location confirmation, device context, and at least two independent witness attestations together.",
        met: fullyReady,
      },
    ],
  };
}
