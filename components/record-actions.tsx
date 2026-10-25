"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "publish" | "unpublish" | "revoke" | "delete";

export function RecordActions({
  experienceId,
  status,
  visibility,
  altered,
  canEdit,
  publicPath,
  publiclyViewable,
}: {
  experienceId: string;
  status: string;
  visibility: string;
  altered: boolean;
  canEdit: boolean;
  publicPath: string;
  publiclyViewable: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = status === "flagged" || status === "revoked";

  async function perform(action: Action) {
    setError(null);
    if (action === "delete") {
      if (
        !window.confirm(
          "Permanently delete this draft or record? Media files and evidence will be removed. This cannot be undone.",
        )
      ) {
        return;
      }
    }
    if (action === "revoke") {
      if (
        !window.confirm(
          "Revoke this record? The public page will show it as revoked and the record cannot be edited further.",
        )
      ) {
        return;
      }
    }
    if (action === "unpublish") {
      if (!window.confirm("Remove this record from public verification?")) return;
    }

    setPending(action);
    try {
      let response: Response;
      if (action === "delete") {
        response = await fetch(`/api/experiences/${experienceId}`, {
          method: "DELETE",
        });
      } else if (action === "revoke") {
        response = await fetch(`/api/experiences/${experienceId}/revoke`, {
          method: "POST",
        });
      } else {
        response = await fetch(`/api/experiences/${experienceId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? "The action could not be completed.");
        return;
      }
      if (action === "delete") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setError("The action could not be completed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {canEdit ? (
          <Link
            className="btn btn--outline btn--sm"
            href={`/dashboard/experiences/${experienceId}/edit`}
          >
            Edit draft
          </Link>
        ) : null}
        {publiclyViewable ? (
          <Link className="btn btn--outline btn--sm" href={publicPath}>
            Public page
          </Link>
        ) : null}
        {!locked && status !== "published" ? (
          <button
            className="btn btn--primary btn--sm"
            type="button"
            onClick={() => void perform("publish")}
            disabled={Boolean(pending) || altered || visibility === "private"}
            title={
              visibility === "private"
                ? "Change visibility to public or unlisted before publishing"
                : altered
                  ? "This record cannot be published while altered"
                  : undefined
            }
          >
            {pending === "publish" ? "Publishing…" : "Publish"}
          </button>
        ) : null}
        {!locked && status === "published" ? (
          <button
            className="btn btn--outline btn--sm"
            type="button"
            onClick={() => void perform("unpublish")}
            disabled={Boolean(pending)}
          >
            {pending === "unpublish" ? "Unpublishing…" : "Unpublish"}
          </button>
        ) : null}
        {!locked && status !== "revoked" ? (
          <button
            className="btn btn--quiet btn--sm"
            type="button"
            onClick={() => void perform("revoke")}
            disabled={Boolean(pending) || altered}
          >
            {pending === "revoke" ? "Revoking…" : "Revoke"}
          </button>
        ) : null}
        <button
          className="btn btn--quiet btn--sm"
          type="button"
          onClick={() => void perform("delete")}
          disabled={Boolean(pending)}
        >
          {pending === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error ? (
        <p className="form-error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
