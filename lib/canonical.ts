/**
 * Deterministic JSON serialization used for every record and evidence hash.
 * Object keys are sorted recursively; array order is preserved.
 */
export function canonicalJson(value: unknown): string {
  return serialize(value, new Set());
}

function serialize(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError("Canonical JSON cannot contain non-finite numbers");
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "undefined":
      return "null";
    case "bigint":
    case "function":
    case "symbol":
      throw new TypeError(`Canonical JSON cannot encode ${typeof value}`);
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError("Canonical JSON cannot encode an invalid Date");
    }
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Canonical JSON cannot encode cycles");
    seen.add(value);
    const result = `[${value.map((entry) => serialize(entry, seen)).join(",")}]`;
    seen.delete(value);
    return result;
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (seen.has(object)) throw new TypeError("Canonical JSON cannot encode cycles");
    seen.add(object);
    const entries = Object.keys(object)
      .sort()
      .filter((key) => object[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${serialize(object[key], seen)}`);
    seen.delete(object);
    return `{${entries.join(",")}}`;
  }

  // Exhaustive for the types handled above.
  throw new TypeError("Unsupported value in canonical JSON");
}
