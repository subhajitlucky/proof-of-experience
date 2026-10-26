"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_RECORD,
} from "@/lib/media-constants";

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

interface LocalFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface ApiErrorDetail {
  path?: string;
  message: string;
}

let fallbackId = 0;
function localId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  fallbackId += 1;
  return `local-${fallbackId}`;
}

function newClaim(): ClaimDraft {
  return { key: localId(), text: "", evidence: "" };
}

function newParticipant(): ParticipantDraft {
  return { key: localId(), name: "", role: "", email: "" };
}

export function NewExperienceForm() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimDraft[]>([
    { key: "claim-initial", text: "", evidence: "" },
  ]);
  const [participants, setParticipants] = useState<ParticipantDraft[]>([]);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ApiErrorDetail[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    };
  }, []);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    setError(null);
    const accepted: LocalFile[] = [];
    const messages: string[] = [];
    const room = MAX_IMAGES_PER_RECORD - files.length;
    if (room <= 0) {
      setError(`A record can contain at most ${MAX_IMAGES_PER_RECORD} images.`);
      return;
    }
    for (const file of Array.from(incoming).slice(0, room)) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        messages.push(`${file.name}: use a JPEG, PNG or WebP image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        messages.push(`${file.name}: images must be under 8 MB.`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      urls.current.push(previewUrl);
      accepted.push({ id: localId(), file, previewUrl });
    }
    if (files.length + accepted.length >= MAX_IMAGES_PER_RECORD && incoming.length > accepted.length + room) {
      messages.push(`Only ${MAX_IMAGES_PER_RECORD} images can be attached.`);
    }
    setFiles((current) => {
      const next = [...current, ...accepted];
      if (!coverId && next[0]) setCoverId(next[0].id);
      return next;
    });
    if (messages.length > 0) setError(messages.join(" "));
  }

  function removeFile(id: string) {
    setFiles((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        urls.current = urls.current.filter((url) => url !== target.previewUrl);
      }
      const next = current.filter((entry) => entry.id !== id);
      if (coverId === id) setCoverId(next[0]?.id ?? null);
      return next;
    });
  }

  function setClaim(key: string, patch: Partial<ClaimDraft>) {
    setClaims((current) =>
      current.map((claim) => (claim.key === key ? { ...claim, ...patch } : claim)),
    );
  }

  function setParticipant(key: string, patch: Partial<ParticipantDraft>) {
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

    const form = event.currentTarget;
    const cleanedClaims = claims
      .map((claim) => ({
        text: claim.text.trim(),
        evidence: claim.evidence.trim() || undefined,
      }))
      .filter((claim) => claim.text.length > 0);
    if (cleanedClaims.length === 0) {
      setError("Add at least one specific claim.");
      errorRef.current?.focus();
      return;
    }

    const nonEmptyParticipants = participants.filter(
      (participant) =>
        participant.name.trim() ||
        participant.role.trim() ||
        participant.email.trim(),
    );
    const invalidParticipant = nonEmptyParticipants.find(
      (participant) => !participant.name.trim() || !participant.role.trim(),
    );
    if (invalidParticipant) {
      setError("Each participant needs both a name and a role.");
      errorRef.current?.focus();
      return;
    }

    const data = new FormData(form);
    const startValue = String(data.get("startAt") ?? "");
    const endValue = String(data.get("endAt") ?? "");
    const startAt = new Date(startValue);
    const endAt = new Date(endValue);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      setError("Choose a valid start and end time.");
      errorRef.current?.focus();
      return;
    }
    if (endAt <= startAt) {
      setError("The end time must be after the start time.");
      errorRef.current?.focus();
      return;
    }

    data.set("startAt", startAt.toISOString());
    data.set("endAt", endAt.toISOString());
    data.set("claims", JSON.stringify(cleanedClaims));
    data.set(
      "participants",
      JSON.stringify(
        nonEmptyParticipants.map((participant) => ({
          name: participant.name.trim(),
          role: participant.role.trim(),
          email: participant.email.trim() || undefined,
        })),
      ),
    );
    if (coverId) {
      const coverIndex = files.findIndex((entry) => entry.id === coverId);
      if (coverIndex >= 0) data.set("coverIndex", String(coverIndex));
    }
    for (const entry of files) data.append("images", entry.file);

    setSubmitting(true);
    try {
      const response = await fetch("/api/experiences", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            data?: { dashboardUrl?: string };
            error?: {
              message?: string;
              details?: Array<{ path?: string; message?: string }>;
            };
          }
        | null;

      if (response.status === 401) {
        router.push("/login?callbackUrl=/dashboard/new");
        return;
      }
      if (!response.ok) {
        setError(payload?.error?.message ?? "The record could not be created.");
        setDetails(
          (payload?.error?.details ?? [])
            .filter((entry): entry is ApiErrorDetail => Boolean(entry.message))
            .slice(0, 6),
        );
        errorRef.current?.focus();
        return;
      }
      router.push(payload?.data?.dashboardUrl ?? "/dashboard");
      router.refresh();
    } catch {
      setError("The record could not be created. Please try again.");
      errorRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div>
        {error ? (
          <div
            className="form-error mb-8"
            role="alert"
            tabIndex={-1}
            ref={errorRef}
          >
            <p>{error}</p>
            {details.length > 0 ? (
              <ul className="error-list mt-2 text-[12px]">
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

        <section className="form-section">
          <div className="form-section__head">
            <span className="section-number">01</span>
            <div>
              <h2 className="form-section__title">The record</h2>
              <p className="form-section__intro">
                Name the experience clearly. This is the first thing a verifier will
                read.
              </p>
            </div>
          </div>
          <div className="stack--sm">
            <div>
              <label className="field-label" htmlFor="title">
                Title
              </label>
              <input
                className="field"
                id="title"
                name="title"
                required
                minLength={3}
                maxLength={160}
                placeholder="e.g. The eleventh firing: raku tea bowls in Kyoto"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="summary">
                Summary
              </label>
              <textarea
                className="field"
                id="summary"
                name="summary"
                required
                minLength={20}
                maxLength={2000}
                rows={4}
                placeholder="What happened, who was involved, and what the evidence records? Avoid superlatives."
              />
              <p className="field-hint">
                Plain description of the experience. This is not a claim and it is
                not signed off on by witnesses.
              </p>
            </div>
            <div className="field-grid field-grid--2">
              <div>
                <label className="field-label" htmlFor="category">
                  Category
                </label>
                <select className="field" id="category" name="category" required defaultValue="">
                  <option value="" disabled>
                    Choose a category
                  </option>
                  <option value="craft">Craft</option>
                  <option value="travel">Travel</option>
                  <option value="food">Food</option>
                  <option value="art">Art</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="locationName">
                  Public location label
                </label>
                <input
                  className="field"
                  id="locationName"
                  name="locationName"
                  required
                  maxLength={160}
                  placeholder="e.g. Kyoto, Japan"
                />
                <p className="field-hint">
                  A city or region. Do not put a private street address here.
                </p>
              </div>
            </div>
            <div className="field-grid field-grid--2">
              <div>
                <label className="field-label" htmlFor="startAt">
                  Starts
                </label>
                <input
                  className="field"
                  id="startAt"
                  name="startAt"
                  type="datetime-local"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="endAt">
                  Ends
                </label>
                <input
                  className="field"
                  id="endAt"
                  name="endAt"
                  type="datetime-local"
                  required
                />
              </div>
            </div>
            <p className="text-[10px] leading-5 text-faint">
              Times are entered in your local timezone and stored in UTC.
            </p>
            <div className="border-t border-rule pt-4">
              <p className="field-label">Location privacy</p>
              <div className="field-grid field-grid--2">
                <div>
                  <label className="field-label text-[9px]" htmlFor="latitude">
                    Latitude <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    className="field"
                    id="latitude"
                    name="latitude"
                    type="number"
                    inputMode="decimal"
                    min="-90"
                    max="90"
                    step="any"
                    placeholder="35.0116"
                  />
                </div>
                <div>
                  <label className="field-label text-[9px]" htmlFor="longitude">
                    Longitude <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    className="field"
                    id="longitude"
                    name="longitude"
                    type="number"
                    inputMode="decimal"
                    min="-180"
                    max="180"
                    step="any"
                    placeholder="135.7681"
                  />
                </div>
              </div>
              <p className="field-hint">
                Exact coordinates are encrypted at rest and excluded from public
                pages and verification JSON unless you opt into exact display.
              </p>
              <label className="check-row mt-3">
                <input
                  className="checkbox"
                  type="checkbox"
                  name="showExactLocation"
                  value="true"
                />
                <span>
                  Show exact coordinates on the public page. They will still never
                  appear in the verification JSON.
                </span>
              </label>
              <label className="check-row mt-3">
                <input
                  className="checkbox"
                  type="checkbox"
                  name="confirmLocation"
                  value="true"
                  defaultChecked
                />
                <span>
                  Confirm that this location and timeframe are accurate. This records
                  a <span className="font-semibold">location_confirmed</span> evidence
                  event, not independent geolocation.
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <span className="section-number">02</span>
            <div>
              <h2 className="form-section__title">Specific claims</h2>
              <p className="form-section__intro">
                Each claim should be something a witness can independently confirm.
                Split broad narratives into precise statements.
              </p>
            </div>
          </div>
          <div className="stack--sm">
            {claims.map((claim, index) => (
              <div className="border border-rule bg-paper-raised p-4" key={claim.key}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="eyebrow">Claim {String(index + 1).padStart(2, "0")}</p>
                  {claims.length > 1 ? (
                    <button
                      className="remove-button"
                      type="button"
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
                <label className="sr-only" htmlFor={`claim-${claim.key}`}>
                  Claim {index + 1} text
                </label>
                <textarea
                  className="field"
                  id={`claim-${claim.key}`}
                  required
                  minLength={5}
                  maxLength={500}
                  rows={3}
                  placeholder="A specific thing you did, made, saw, served, guided or witnessed."
                  value={claim.text}
                  onChange={(event) => setClaim(claim.key, { text: event.target.value })}
                />
                <div className="mt-3">
                  <label
                    className="field-label text-[9px]"
                    htmlFor={`claim-evidence-${claim.key}`}
                  >
                    Supporting evidence note <span className="normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    className="field field--compact"
                    id={`claim-evidence-${claim.key}`}
                    maxLength={1000}
                    placeholder="e.g. kiln log, supplier note, dated field journal"
                    value={claim.evidence}
                    onChange={(event) =>
                      setClaim(claim.key, { evidence: event.target.value })
                    }
                  />
                </div>
              </div>
            ))}
            {claims.length < 12 ? (
              <div>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setClaims((current) => [...current, newClaim()])}
                >
                  Add another claim
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <span className="section-number">03</span>
            <div>
              <h2 className="form-section__title">Media evidence</h2>
              <p className="form-section__intro">
                JPEG, PNG or WebP. Each file is hashed with SHA-256. EXIF capture date
                and GPS are read when present.
              </p>
            </div>
          </div>
          <label className="image-drop" htmlFor="record-images">
            <input
              id="record-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <span className="block font-display text-[25px] leading-tight">
              Add photographs
            </span>
            <span className="mt-2 block text-[11px] text-muted">
              Up to {MAX_IMAGES_PER_RECORD} images · 8 MB each · one cover
            </span>
          </label>
          {files.length > 0 ? (
            <div className="preview-grid mt-4">
              {files.map((entry) => (
                <div className="preview-tile" key={entry.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.previewUrl} alt={`Preview of ${entry.file.name}`} />
                  <div className="preview-tile__bar">
                    <span className="min-w-0 truncate" title={entry.file.name}>
                      {entry.file.name}
                    </span>
                    <span className="shrink-0">
                      {(entry.file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-rule px-2 py-1.5">
                    <label className="cover-check">
                      <input
                        className="checkbox"
                        type="radio"
                        name="cover-choice"
                        checked={coverId === entry.id}
                        onChange={() => setCoverId(entry.id)}
                      />
                      Cover image
                    </label>
                    <button
                      className="remove-button"
                      type="button"
                      onClick={() => removeFile(entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <p className="field-hint">
            GPS coordinates inside images are encrypted at rest. The public record
            only reveals whether GPS metadata was present.
          </p>
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <span className="section-number">04</span>
            <div>
              <h2 className="form-section__title">People present</h2>
              <p className="form-section__intro">
                Optional participants. Their emails are private and never shown on
                the public record.
              </p>
            </div>
          </div>
          {participants.length > 0 ? (
            <div className="stack--sm">
              {participants.map((participant, index) => (
                <div
                  className="border border-rule bg-paper-raised p-4"
                  key={participant.key}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="eyebrow">Participant {String(index + 1).padStart(2, "0")}</p>
                    <button
                      className="remove-button"
                      type="button"
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
                        htmlFor={`participant-name-${participant.key}`}
                      >
                        Name
                      </label>
                      <input
                        className="field"
                        id={`participant-name-${participant.key}`}
                        maxLength={120}
                        required
                        value={participant.name}
                        onChange={(event) =>
                          setParticipant(participant.key, { name: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label
                        className="field-label"
                        htmlFor={`participant-role-${participant.key}`}
                      >
                        Role
                      </label>
                      <input
                        className="field"
                        id={`participant-role-${participant.key}`}
                        maxLength={120}
                        required
                        placeholder="Studio assistant"
                        value={participant.role}
                        onChange={(event) =>
                          setParticipant(participant.key, { role: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label
                      className="field-label"
                      htmlFor={`participant-email-${participant.key}`}
                    >
                      Email <span className="normal-case tracking-normal">(optional, private)</span>
                    </label>
                    <input
                      className="field field--compact"
                      id={`participant-email-${participant.key}`}
                      type="email"
                      maxLength={254}
                      value={participant.email}
                      onChange={(event) =>
                        setParticipant(participant.key, { email: event.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {participants.length < 20 ? (
            <button
              type="button"
              className="btn btn--outline btn--sm mt-3"
              onClick={() =>
                setParticipants((current) => [...current, newParticipant()])
              }
            >
              Add a participant
            </button>
          ) : null}
        </section>

        <section className="form-section">
          <div className="form-section__head">
            <span className="section-number">05</span>
            <div>
              <h2 className="form-section__title">Publication</h2>
              <p className="form-section__intro">
                New records begin as drafts. Nothing appears publicly until you
                publish and invite verification.
              </p>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="visibility">
              Visibility
            </label>
            <select
              className="field max-w-md"
              id="visibility"
              name="visibility"
              defaultValue="public"
            >
              <option value="public">Public — verifiable by anyone with the link</option>
              <option value="unlisted">Unlisted — accessible only by direct link</option>
              <option value="private">Private — creator only; cannot publish</option>
            </select>
            <p className="field-hint">
              Public and unlisted records can be published after you add evidence.
              Private records remain hidden.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button className="btn btn--primary" type="submit" disabled={submitting}>
              {submitting
                ? "Hashing evidence and creating draft…"
                : "Create draft record"}
              {!submitting ? (
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </button>
            <Link className="btn btn--quiet" href="/dashboard">
              Cancel
            </Link>
          </div>
        </section>
      </div>

      <aside className="self-start lg:sticky lg:top-24">
        <div className="panel panel--graphite">
          <div className="panel__header">
            <div>
              <p className="eyebrow">What happens next</p>
              <p className="mt-2 font-display text-[22px] leading-tight">
                A draft with evidence, not a verdict.
              </p>
            </div>
          </div>
          <div className="panel__body stack--sm text-[12px] leading-6 text-muted">
            <p>
              Every image is hashed and added to a hash-chained evidence timeline.
              The draft is not sealed until you invite a witness or publish.
            </p>
            <p>
              Invite witnesses from the record page. Each invitation is tied to one
              claim, expires after seven days, and can be used once.
            </p>
            <p>
              Two independent witnesses are required for witness-verified status.
              Location and device context are listed separately, never blended into
              a score.
            </p>
            <div className="border-t border-rule pt-4">
              <p className="eyebrow mb-2">Privacy defaults</p>
              <ul className="space-y-2">
                <li>Exact coordinates encrypted at rest.</li>
                <li>Witness emails never public.</li>
                <li>Participant emails never public.</li>
                <li>Media served through an access-controlled route.</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-5 px-1 text-[10px] leading-5 text-faint">
          This MVP uses a server-held signing key. Signatures establish record
          integrity and signer custody, not legal validity.
        </p>
      </aside>
    </form>
  );
}
