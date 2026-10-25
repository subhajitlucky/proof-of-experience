"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddEvidenceButtons({
  experienceId,
  missingLocation,
  missingDevice,
  disabled,
}: {
  experienceId: string;
  missingLocation: boolean;
  missingDevice: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(type: "location_confirmed" | "device_attested") {
    const copy =
      type === "location_confirmed"
        ? "Confirm that the location and timeframe on this record are accurate? This adds a creator confirmation event and re-seals the record."
        : "Record capture-device context for this record? This adds a creator confirmation event and re-seals the record.";
    if (!window.confirm(copy)) return;
    setError(null);
    setLoading(type);
    try {
      const response = await fetch(`/api/experiences/${experienceId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? "Evidence could not be added.");
        return;
      }
      router.refresh();
    } catch {
      setError("Evidence could not be added. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {missingLocation ? (
          <button
            className="btn btn--outline btn--sm"
            type="button"
            disabled={disabled || Boolean(loading)}
            onClick={() => void add("location_confirmed")}
          >
            {loading === "location_confirmed" ? "Recording…" : "Confirm location"}
          </button>
        ) : null}
        {missingDevice ? (
          <button
            className="btn btn--outline btn--sm"
            type="button"
            disabled={disabled || Boolean(loading)}
            onClick={() => void add("device_attested")}
          >
            {loading === "device_attested" ? "Recording…" : "Record device context"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="form-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
