import type { TrustResult } from "@/lib/trust";
import type { TrustLevel } from "@prisma/client";

export function TrustSeal({
  level,
  label,
  size = "default",
  ink = false,
}: {
  level?: TrustLevel;
  label: string;
  size?: "default" | "attestation";
  ink?: boolean;
}) {
  const main =
    level === "fully_verified"
      ? "Fully verified"
      : level === "witness_verified"
        ? "Witness verified"
        : level === "device_verified"
          ? "Device verified"
          : level === "location_verified"
            ? "Location verified"
            : label;
  return (
    <div
      className={`trust-seal ${ink ? "trust-seal--ink" : ""} ${
        size === "attestation" ? "attest-stamp" : ""
      }`}
      role="img"
      aria-label={`Trust level: ${main}`}
    >
      <div className="trust-seal__inner">
        <span className="trust-seal__top">Proof of Experience</span>
        <span className="trust-seal__main">{main}</span>
        <span className="trust-seal__year">Record integrity</span>
      </div>
    </div>
  );
}

export function TrustCriteria({ trust }: { trust: TrustResult }) {
  return (
    <ul className="criteria-list">
      {trust.criteria.map((criterion) => (
        <li
          key={criterion.key}
          className={`criteria-item ${criterion.met ? "criteria-item--met" : ""}`}
        >
          <span className="criteria-mark" aria-hidden="true" />
          <span>
            <span className="criteria-title">
              {criterion.label}
              <span className="sr-only">
                {criterion.met ? ": met" : ": not met"}
              </span>
            </span>
            <span className="criteria-detail">{criterion.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
