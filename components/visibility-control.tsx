"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VisibilityControl({
  experienceId,
  visibility,
  disabled,
}: {
  experienceId: string;
  visibility: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(visibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const response = await fetch(`/api/experiences/${experienceId}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: value }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? "Visibility could not be changed.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Visibility could not be changed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="field-with-button">
        <div className="grow">
          <label className="field-label" htmlFor="visibility-control">
            Visibility
          </label>
          <select
            className="field field--compact"
            id="visibility-control"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSaved(false);
            }}
            disabled={disabled || loading}
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
        <button
          className="btn btn--outline btn--sm"
          type="button"
          onClick={() => void save()}
          disabled={disabled || loading || value === visibility}
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
      {disabled ? (
        <p className="field-hint">
          Unpublish the record before changing who can access it.
        </p>
      ) : null}
      {saved ? (
        <p className="mt-2 text-[11px] text-ink-soft" aria-live="polite">
          Visibility updated.
        </p>
      ) : null}
      {error ? (
        <p className="form-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
