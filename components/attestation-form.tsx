"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface AttestationResult {
  state: "attested";
  attestedAt: string;
  claimText: string;
  recordTitle: string;
  verificationUrl: string | null;
  trustLevel: string;
}

export function AttestationForm({
  token,
  invitedName,
  altered,
  expiresAt,
}: {
  token: string;
  invitedName: string;
  altered: boolean;
  expiresAt: string;
}) {
  const [relationship, setRelationship] = useState("");
  const [confirmName, setConfirmName] = useState(false);
  const [confirmRelationship, setConfirmRelationship] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttestationResult | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) successHeading.current?.focus();
  }, [result]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/attestations/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: invitedName,
            relationship,
            confirmName,
            confirmRelationship,
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | {
            data?: AttestationResult;
            error?: { message?: string; details?: Array<{ message?: string }> };
          }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "The attestation could not be recorded.");
        return;
      }
      if (payload?.data) setResult(payload.data);
    } catch {
      setError("The attestation could not be recorded. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="attest-success" aria-live="polite">
        <div className="flex flex-col items-center text-center">
          <div className="stamp-wrap">
            <div className="trust-seal trust-seal--ink attest-stamp animate-stamp">
              <div className="trust-seal__inner">
                <span className="trust-seal__top">Proof of Experience</span>
                <span className="trust-seal__main">Witnessed</span>
                <span className="trust-seal__year">Attestation recorded</span>
              </div>
            </div>
          </div>
          <p className="eyebrow eyebrow--accent mt-8">Signature stored</p>
          <h2
            className="mt-3 font-display text-[36px] leading-none"
            tabIndex={-1}
            ref={successHeading}
          >
            Your attestation is recorded.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted">
            You attested to: <span className="text-ink">“{result.claimText}”</span>
          </p>
          <p className="mt-5 border-t border-rule pt-5 text-[11px] leading-5 text-faint">
            The link has been used and cannot be used again. The creator can now
            publish this record for public verification. Your email will never be
            shown publicly.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {result.verificationUrl ? (
              <Link className="btn btn--primary" href={result.verificationUrl}>
                View the public record
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ) : (
              <Link className="btn btn--outline" href="/">
                Return to Proof of Experience
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">Your attestation</p>
      <h2 className="mt-3 font-display text-[32px] leading-none sm:text-[40px]">
        Sign this specific claim.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        Confirm your name and relationship. Signing creates an Ed25519 attestation
        over the claim, this record&apos;s current hash, your witness ID and the
        timestamp. This is not a legal signature.
      </p>

      {altered ? (
        <div className="form-error mt-6" role="alert">
          This record&apos;s integrity check is currently failing. New attestations
          cannot be signed until the creator resolves the issue.
        </div>
      ) : (
        <form className="mt-7 stack--sm" onSubmit={onSubmit}>
          {error ? (
            <div className="form-error" role="alert">
              {error}
            </div>
          ) : null}
          <div>
            <label className="field-label" htmlFor="witness-name">
              Your name
            </label>
            <input
              className="field"
              id="witness-name"
              name="name"
              value={invitedName}
              readOnly
              aria-describedby="witness-name-hint"
            />
            <p className="field-hint" id="witness-name-hint">
              Use the name you were invited under. Contact the creator if it is
              incorrect.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="witness-relationship">
              Your relationship to the creator or experience
            </label>
            <textarea
              className="field"
              id="witness-relationship"
              name="relationship"
              required
              minLength={3}
              maxLength={200}
              placeholder="For example: studio assistant during the firing; collector who commissioned the work; field researcher present for the observation."
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
            />
            <p className="field-hint">
              This relationship is shown publicly with your attestation. Your email
              is not.
            </p>
          </div>

          <div className="stack--sm border-t border-rule pt-5">
            <div className="check-row">
              <input
                className="checkbox"
                type="checkbox"
                id="confirm-name"
                name="confirmName"
                checked={confirmName}
                onChange={(event) => setConfirmName(event.target.checked)}
                required
              />
              <label htmlFor="confirm-name">
                I confirm that I am {invitedName} and that this is my attestation.
              </label>
            </div>
            <div className="check-row">
              <input
                className="checkbox"
                type="checkbox"
                id="confirm-relationship"
                name="confirmRelationship"
                checked={confirmRelationship}
                onChange={(event) => setConfirmRelationship(event.target.checked)}
                required
              />
              <label htmlFor="confirm-relationship">
                I confirm that the relationship described above is accurate.
              </label>
            </div>
          </div>

          <button
            className="btn btn--accent w-full sm:w-auto"
            type="submit"
            disabled={loading || !confirmName || !confirmRelationship}
          >
            {loading ? "Recording signature…" : "Sign witness attestation"}
            {!loading ? (
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            ) : null}
          </button>
          <p className="text-[10px] leading-5 text-faint">
            This link expires{" "}
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "UTC",
            }).format(new Date(expiresAt))}{" "}
            UTC and can be used once.
          </p>
        </form>
      )}
    </div>
  );
}
