"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./copy-button";

interface InviteResult {
  witness: {
    id: string;
    name: string;
    email: string;
    claimId: string;
    expiresAt: string;
  };
  attestationUrl: string;
}

export function InviteWitnessForm({
  experienceId,
  claims,
  locked,
  altered,
}: {
  experienceId: string;
  claims: Array<{ id: string; position: number; text: string }>;
  locked: boolean;
  altered: boolean;
}) {
  const router = useRouter();
  const [claimId, setClaimId] = useState(claims[0]?.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/experiences/${experienceId}/witnesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, name, email }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: InviteResult; error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "The witness could not be invited.");
        return;
      }
      if (payload?.data) {
        setResult(payload.data);
        setName("");
        setEmail("");
        router.refresh();
      }
    } catch {
      setError("The witness could not be invited. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (locked || altered) {
    return (
      <p className="text-[12px] leading-6 text-faint">
        {altered
          ? "Witness invitations are disabled while the record fails its integrity check."
          : "This record cannot receive new witness invitations while flagged or revoked."}
      </p>
    );
  }

  return (
    <div>
      <p className="text-[12px] leading-6 text-muted">
        Invite a person to attest to one specific claim. They must confirm their name
        and relationship. The link expires after seven days and is single-use.
      </p>
      <form className="mt-4 stack--sm" onSubmit={submit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <label className="field-label" htmlFor="witness-claim">
            Claim to witness
          </label>
          <select
            className="field field--compact"
            id="witness-claim"
            required
            value={claimId}
            onChange={(event) => setClaimId(event.target.value)}
          >
            {claims.map((claim) => (
              <option key={claim.id} value={claim.id}>
                {String(claim.position).padStart(2, "0")} — {claim.text.slice(0, 90)}
                {claim.text.length > 90 ? "…" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="witness-name-invite">
            Witness name
          </label>
          <input
            className="field field--compact"
            id="witness-name-invite"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="witness-email-invite">
            Witness email
          </label>
          <input
            className="field field--compact"
            id="witness-email-invite"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="field-hint">
            Private. Used only to identify the invitation; never shown publicly.
          </p>
        </div>
        <button className="btn btn--outline btn--sm" type="submit" disabled={loading}>
          {loading ? "Creating single-use link…" : "Invite witness"}
        </button>
      </form>

      {result ? (
        <div className="mt-5 border border-vermilion bg-vermilion-wash p-3">
          <p className="eyebrow eyebrow--accent">Invitation link ready</p>
          <p className="mt-2 text-[12px] leading-5 text-ink-soft">
            Send this link privately to {result.witness.name}. It works once, for the
            selected claim, and expires{" "}
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(result.witness.expiresAt))}
            . In development, the URL is also logged to the server console.
          </p>
          <div className="copy-field mt-3">
            <input
              className="field field--compact"
              readOnly
              value={result.attestationUrl}
              aria-label="Witness attestation link"
              onFocus={(event) => event.target.select()}
            />
            <CopyButton value={result.attestationUrl} label="Copy link" copiedLabel="Copied" />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-vermilion-dark">
            This is a bearer link. Do not post it publicly.
          </p>
        </div>
      ) : null}
    </div>
  );
}
