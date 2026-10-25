import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/lib/canonical";
import { sha256Hex } from "@/lib/crypto";

describe("canonical JSON", () => {
  it("sorts keys recursively and is stable across insertion order", () => {
    const left = canonicalJson({
      z: 1,
      a: { second: "two", first: "one" },
      list: [{ y: 2, x: 1 }, 3],
    });
    const right = canonicalJson({
      list: [{ x: 1, y: 2 }, 3],
      a: { first: "one", second: "two" },
      z: 1,
    });
    expect(left).toBe(right);
    expect(left).toBe(
      '{"a":{"first":"one","second":"two"},"list":[{"x":1,"y":2},3],"z":1}',
    );
  });

  it("preserves array order and omits undefined object values", () => {
    expect(
      canonicalJson({ b: [2, 1], a: undefined, c: { keep: true, skip: undefined } }),
    ).toBe('{"b":[2,1],"c":{"keep":true}}');
  });

  it("serializes dates as ISO strings", () => {
    expect(canonicalJson({ at: new Date("2026-03-01T10:00:00.000Z") })).toBe(
      '{"at":"2026-03-01T10:00:00.000Z"}',
    );
  });

  it("refuses cycles and non-finite numbers", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow(/cycles/);
    expect(() => canonicalJson({ value: Infinity })).toThrow(/non-finite/);
  });
});

describe("SHA-256 hashing", () => {
  it("matches standard test vectors", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is stable for canonical JSON and distinct for changed content", () => {
    const base = canonicalJson({ claims: ["one"], media: ["sha-a"] });
    const changed = canonicalJson({ claims: ["one changed"], media: ["sha-a"] });
    expect(sha256Hex(base)).toHaveLength(64);
    expect(sha256Hex(base)).not.toBe(sha256Hex(changed));
  });
});
