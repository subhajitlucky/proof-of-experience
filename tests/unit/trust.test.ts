import { describe, expect, it } from "vitest";
import { calculateTrust } from "@/lib/trust";

const base = {
  signed: true,
  locationConfirmed: false,
  deviceAttested: false,
  independentWitnesses: 0,
};

describe("trust level calculation", () => {
  it("starts at self-attested", () => {
    expect(calculateTrust(base).level).toBe("self_attested");
  });

  it("does not lift unsigned drafts because evidence exists", () => {
    expect(
      calculateTrust({
        ...base,
        signed: false,
        locationConfirmed: true,
        deviceAttested: true,
        independentWitnesses: 2,
      }).level,
    ).toBe("self_attested");
  });

  it("recognizes location and device evidence", () => {
    expect(calculateTrust({ ...base, locationConfirmed: true }).level).toBe(
      "location_verified",
    );
    expect(calculateTrust({ ...base, deviceAttested: true }).level).toBe(
      "device_verified",
    );
  });

  it("requires two independent witnesses for witness verification", () => {
    expect(calculateTrust({ ...base, independentWitnesses: 1 }).level).toBe(
      "self_attested",
    );
    expect(calculateTrust({ ...base, independentWitnesses: 2 }).level).toBe(
      "witness_verified",
    );
  });

  it("requires both location and device evidence for fully verified", () => {
    expect(
      calculateTrust({
        ...base,
        independentWitnesses: 2,
        locationConfirmed: true,
      }).level,
    ).toBe("witness_verified");
    expect(
      calculateTrust({
        ...base,
        independentWitnesses: 2,
        locationConfirmed: true,
        deviceAttested: true,
      }).level,
    ).toBe("fully_verified");
  });

  it("publishes criteria rather than an opaque score", () => {
    const result = calculateTrust({
      ...base,
      independentWitnesses: 2,
      locationConfirmed: true,
      deviceAttested: true,
    });
    expect(result.criteria).toHaveLength(5);
    expect(result.criteria.every((criterion) => criterion.met)).toBe(true);
  });
});
