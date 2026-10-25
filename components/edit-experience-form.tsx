"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ClaimDraft {
  key: string;
  text: string;
  evidence: string;
}

interface ParticipantDraft {
  key: string;
  name: string;
  role: string;
  email: string;
}

interface EditExperienceFormProps {
  experience: {
    id: string;
    title: string;
    summary: string;
    category: string;
    locationName: string;
    startAtLocal: string;
    endAtLocal: string;
    visibility: string;
    showExactLocation: boolean;
    latitude: number | null;
    longitude: number | null;
    claims: ClaimDraft[];
    participants: ParticipantDraft[];
  };
}

let fallback = 0;
function idFor(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  fallback += 1;
  return `${prefix}-${fallback}`;
}

function utcDate(value: string): Date {
  const normalized =
    value.length === 16 ? `${value}:00.000Z` : value.endsWith("Z") ? value : `${value}Z`;
  return new Date(normalized);
}

export function EditExperienceForm({ experience }: EditExperienceFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(experience.title);
  const [summary, setSummary] = useState(experience.summary);
  const [category, setCategory] = useState(experience.category);
  const [locationName, setLocationName] = useState(experience.locationName);
  const [startAt, setStartAt] = useState(experience.startAtLocal);
  const [endAt, setEndAt] = useState(experience.endAtLocal);
  const [visibility, setVisibility] = useState(experience.visibility);
  const [showExactLocation, setShowExactLocation] = useState(
    experience.showExactLocation,
  );
  const [latitude, setLatitude] = useState(
    experience.latitude === null ? "" : String(experience.latitude),
  );
  const [longitude, setLongitude] = useState(
    experience.longitude === null ? "" : String(experience.longitude),
  );
  const [claims, setClaims] = useState<ClaimDraft[]>(
    experience.claims.length
      ? experience.claims
      : [{ key: idFor("claim"), text: "", evidence: "" }],
  );
  const [participants, setParticipants] = useState<ParticipantDraft[]>(
    experience.participants,
  );
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<Array<{ path?: string; message: string }>>([]);
  const [saving, setSaving] = useState(false);

  function updateClaim(key: string, patch: Partial<ClaimDraft>) {
    setClaims((current) =>
      current.map((claim) => (claim.key === key ? { ...claim, ...patch } : claim)),
    );
  }

  function updateParticipant(key: string, patch: Partial<ParticipantDraft>) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.key === key ? { ...participant, ...patch } : participant,
      ),
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDetails([]);

    const cleanedClaims = claims
      .map((claim) => ({
        text: claim.text.trim(),
        evidence: claim.evidence.trim() || undefined,
      }))
      .filter((claim) => claim.text.length > 0);
    if (cleanedClaims.length === 0) {
      setError("A record needs at least one claim.");
      return;
    }
    const invalidParticipant = participants.find(
      (participant) =>
        participant.name.trim() &&
        participant.role.trim() &&
        participant.email.trim().length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email.trim()),
    );
    if (invalidParticipant) {
      setError("A participant email address is invalid.");
      return;
    }
    const incompleteParticipant = participants.find(
      (participant) =>
        (participant.name.trim() || participant.role.trim() || participant.email.trim()) &&
        (!participant.name.trim() || !participant.role.trim()),
    );
    if (incompleteParticipant) {
      setError("Each participant needs both a name and a role.");
      return;
    }

    const start = utcDate(startAt);
    const end = utcDate(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Choose a valid start and end time.");
      return;
    }
    if (end <= start) {
      setError("The end time must be after the start time.");
      return;
    }

    if ((latitude.trim() && !longitude.trim()) || (!latitude.trim() && longitude.trim())) {
      setError("Latitude and longitude must be provided together.");
      return;
    }
    if (
      experience.latitude !== null &&
      (!latitude.trim() || !longitude.trim())
    ) {
      setError(
        "Coordinates cannot be removed in this MVP. Restore both values, or create a new record.",
      );
      return;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      summary: summary.trim(),
      category,
      locationName: locationName.trim(),
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      visibility,
      showExactLocation,
      claims: cleanedClaims,
      participants: participants
        .filter(
          (participant) =>
            participant.name.trim() ||
            participant.role.trim() ||
            participant.email.trim(),
        )
        .map((participant) => ({
          name: participant.name.trim(),
          role: participant.role.trim(),
          email: participant.email.trim() || undefined,
        })),
    };

    const nextLatitude = latitude.trim() ? Number(latitude) : undefined;
    const nextLongitude = longitude.trim() ? Number(longitude) : undefined;
    if (
      nextLatitude !== undefined &&
      nextLongitude !== undefined &&
      (nextLatitude !== experience.latitude || nextLongitude !== experience.longitude)
    ) {
      payload.latitude = nextLatitude;
      payload.longitude = nextLongitude;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/experiences/${experience.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            error?: {
              message?: string;
              details?: Array<{ path?: string; message?: string }>;
            };
          }
        | null;
      if (!response.ok) {
        setError(body?.error?.message ?? "The draft could not be saved.");
        setDetails(
          (body?.error?.details ?? [])
            .filter((entry): entry is { path?: string; message: string } =>
              Boolean(entry.message),
            )
            .slice(0, 6),
        );
        return;
      }
      router.push(`/dashboard/experiences/${experience.id}`);
      router.refresh();
    } catch {
      setError("The draft could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="stack gap-8" onSubmit={submit}>
      {error ? (
        <div className="form-error" role="alert">
          <p>{error}</p>
          {details.length > 0 ? (
            <ul className="error-list mt-2">
              {details.map((detail, index) => (
                <li key={`${detail.path ?? "error"}-${index}`}>
                  {detail.path ? `${detail.path}: ` : ""}
                  {detail.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">01 · The record</p>
            <h2 className="mt-2 font-display text-[28px] leading-none">
              Title and summary
            </h2>
          </div>
        </div>
        <div className="panel__body stack--sm">
          <div>
            <label className="field-label" htmlFor="edit-title">
              Title
            </label>
            <input
              className="field"
              id="edit-title"
              required
              minLength={3}
              maxLength={160}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="edit-summary">
              Summary
            </label>
            <textarea
              className="field"
              id="edit-summary"
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="field-grid field-grid--2">
            <div>
              <label className="field-label" htmlFor="edit-category">
                Category
              </label>
              <select
                className="field"
                id="edit-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="craft">Craft</option>
                <option value="travel">Travel</option>
                <option value="food">Food</option>
                <option value="art">Art</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="edit-location">
                Public location label
              </label>
              <input
                className="field"
                id="edit-location"
                required
                maxLength={160}
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
              />
            </div>
          </div>
          <div className="field-grid field-grid--2">
            <div>
              <label className="field-label" htmlFor="edit-start">
                Starts (UTC)
              </label>
              <input
                className="field"
                id="edit-start"
                type="datetime-local"
                required
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="edit-end">
                Ends (UTC)
              </label>
              <input
                className="field"
                id="edit-end"
                type="datetime-local"
                required
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </div>
          </div>
          <div className="notice">
            Changing the place or time clears the existing location confirmation.
            You will need to confirm the new details on the record page before
            publishing for location-verified status.
          </div>
          <div className="field-grid field-grid--2">
            <div>
              <label className="field-label" htmlFor="edit-latitude">
                Latitude
              </label>
              <input
                className="field"
                id="edit-latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="edit-longitude">
                Longitude
              </label>
              <input
                className="field"
                id="edit-longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </div>
          </div>
          <label className="check-row">
            <input
              className="checkbox"
              type="checkbox"
              checked={showExactLocation}
              onChange={(event) => setShowExactLocation(event.target.checked)}
            />
            <span>
              Show exact coordinates on the public page. Verification JSON never
              includes exact coordinates.
            </span>
          </label>
          <div>
            <label className="field-label" htmlFor="edit-visibility">
              Visibility
            </label>
            <select
              className="field"
              id="edit-visibility"
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="public">Public after publishing</option>
              <option value="unlisted">Unlisted — direct link only</option>
              <option value="private">Private — hidden</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">02 · Claims</p>
            <h2 className="mt-2 font-display text-[28px] leading-none">
              Specific assertions
            </h2>
          </div>
          {claims.length < 12 ? (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() =>
                setClaims((current) => [
                  ...current,
                  { key: idFor("claim"), text: "", evidence: "" },
                ])
              }
            >
              Add claim
            </button>
          ) : null}
        </div>
        <div className="panel__body stack--sm">
          {claims.map((claim, index) => (
            <div className="border border-rule bg-paper-white p-4" key={claim.key}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="eyebrow">Claim {String(index + 1).padStart(2, "0")}</p>
                {claims.length > 1 ? (
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() =>
                      setClaims((current) =>
                        current.filter((entry) => entry.key !== claim.key),
                      )
                    }
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <label className="sr-only" htmlFor={`edit-claim-${claim.key}`}>
                Claim {index + 1}
              </label>
              <textarea
                className="field"
                id={`edit-claim-${claim.key}`}
                required
                minLength={5}
                maxLength={500}
                rows={3}
                value={claim.text}
                onChange={(event) =>
                  updateClaim(claim.key, { text: event.target.value })
                }
              />
              <div className="mt-3">
                <label
                  className="field-label text-[9px]"
                  htmlFor={`edit-evidence-${claim.key}`}
                >
                  Evidence note <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  className="field field--compact"
                  id={`edit-evidence-${claim.key}`}
                  maxLength={1000}
                  value={claim.evidence}
                  onChange={(event) =>
                    updateClaim(claim.key, { evidence: event.target.value })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">03 · Participants</p>
            <h2 className="mt-2 font-display text-[28px] leading-none">
              People present
            </h2>
          </div>
          {participants.length < 20 ? (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() =>
                setParticipants((current) => [
                  ...current,
                  { key: idFor("participant"), name: "", role: "", email: "" },
                ])
              }
            >
              Add person
            </button>
          ) : null}
        </div>
        <div className="panel__body stack--sm">
          {participants.length === 0 ? (
            <p className="text-sm text-muted">No participants recorded.</p>
          ) : (
            participants.map((participant, index) => (
              <div
                className="border border-rule bg-paper-white p-4"
                key={participant.key}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow">
                    Participant {String(index + 1).padStart(2, "0")}
                  </p>
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() =>
                      setParticipants((current) =>
                        current.filter((entry) => entry.key !== participant.key),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                <div className="field-grid field-grid--2">
                  <div>
                    <label
                      className="field-label"
                      htmlFor={`edit-participant-name-${participant.key}`}
                    >
                      Name
                    </label>
                    <input
                      className="field"
                      id={`edit-participant-name-${participant.key}`}
                      value={participant.name}
                      onChange={(event) =>
                        updateParticipant(participant.key, {
                          name: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label
                      className="field-label"
                      htmlFor={`edit-participant-role-${participant.key}`}
                    >
                      Role
                    </label>
                    <input
                      className="field"
                      id={`edit-participant-role-${participant.key}`}
                      value={participant.role}
                      onChange={(event) =>
                        updateParticipant(participant.key, {
                          role: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label
                    className="field-label"
                    htmlFor={`edit-participant-email-${participant.key}`}
                  >
                    Private email
                  </label>
                  <input
                    className="field field--compact"
                    id={`edit-participant-email-${participant.key}`}
                    type="email"
                    value={participant.email}
                    onChange={(event) =>
                      updateParticipant(participant.key, {
                        email: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <button className="btn btn--primary" type="submit" disabled={saving}>
          {saving ? "Saving draft…" : "Save draft"}
          {!saving ? (
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </button>
        <Link
          className="btn btn--quiet"
          href={`/dashboard/experiences/${experience.id}`}
        >
          Cancel
        </Link>
        <p className="text-[10px] leading-5 text-faint">
          Media remains unchanged. Signed records cannot be edited.
        </p>
      </div>
    </form>
  );
}
