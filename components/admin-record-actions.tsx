"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminAction = "flag" | "unflag" | "revoke" | "restore";

const ACTIONS_BY_STATUS: Record<string, AdminAction[]> = {
  published: ["flag", "revoke"],
  flagged: ["unflag", "revoke"],
  revoked: ["restore"],
};

const ACTION_LABELS: Record<AdminAction, string> = {
  flag: "Flag for review",
  unflag: "Remove flag",
  revoke: "Revoke record",
  restore: "Restore record",
};

const REASON_HINTS: Record<AdminAction, string> = {
  flag: "Describe the concern for the registry record.",
  unflag: "Note why the record is being released from review.",
  revoke: "Explain the basis for revocation.",
  restore: "Explain why the revocation is being lifted.",
};

export function AdminRecordActions({
  experienceId,
  status,
}: {
  experienceId: string;
  status: string;
}) {
  const router = useRouter();
  const available = ACTIONS_BY_STATUS[status] ?? [];
  const [action, setAction] = useState<AdminAction>(available[0] ?? "flag");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const fieldId = `admin-reason-${experienceId}`;
  const selectId = `admin-action-${experienceId}`;

  async function apply() {
    setError(null);
    setSaved(null);
    if (reason.trim().length < 5) {
      setError("Add a reason of at least five characters.");
      return;
    }
    if (
      (action === "flag" || action === "revoke") &&
      !window.confirm(`${ACTION_LABELS[action]}? The action is recorded in the append-only audit log.`)
    ) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/experiences/${experienceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            data?: { status?: string; integrityAltered?: boolean };
            error?: { message?: string };
          }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "The administrative action failed.");
        return;
      }
      setSaved(
        payload?.data?.integrityAltered
          ? "Action recorded. Record integrity is still in an altered state; it was not re-sealed."
          : "Action recorded. The append-only audit log has been updated.",
      );
      setReason("");
      router.refresh();
    } catch {
      setError("The administrative action failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (available.length === 0) {
    return <p className="text-[11px] text-faint">No actions available.</p>;
  }

  return (
    <div>
      <div className="field-grid field-grid--2">
        <div>
          <label className="field-label text-[9px]" htmlFor={selectId}>
            Action
          </label>
          <select
            className="field field--compact"
            id={selectId}
            value={action}
            onChange={(event) => {
              setAction(event.target.value as AdminAction);
              setSaved(null);
            }}
          >
            {available.map((option) => (
              <option key={option} value={option}>
                {ACTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label text-[9px]" htmlFor={fieldId}>
            Reason (recorded)
          </label>
          <input
            className="field field--compact"
            id={fieldId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={REASON_HINTS[action]}
            maxLength={500}
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          className="btn btn--outline btn--sm"
          type="button"
          onClick={() => void apply()}
          disabled={loading}
        >
          {loading ? "Applying…" : "Apply action"}
        </button>
        {saved ? (
          <p className="text-[10px] leading-4 text-muted" role="status">
            {saved}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="form-error mt-2 text-[11px]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
