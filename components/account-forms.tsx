"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function ProfileForm({
  initial,
}: {
  initial: {
    name: string;
    handle: string;
    bio: string;
    avatarUrl: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [handle, setHandle] = useState(initial.handle);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, bio, avatarUrl }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Profile could not be saved.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Profile could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack--sm" onSubmit={submit}>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="notice notice--accent" role="status">
          Profile updated.
        </p>
      ) : null}
      <div className="field-grid field-grid--2">
        <div>
          <label className="field-label" htmlFor="profile-name">
            Name
          </label>
          <input
            className="field"
            id="profile-name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="profile-handle">
            Public handle
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
              @
            </span>
            <input
              className="field pl-7"
              id="profile-handle"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={handle}
              onChange={(event) =>
                setHandle(
                  event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
            />
          </div>
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="profile-bio">
          Short bio
        </label>
        <textarea
          className="field"
          id="profile-bio"
          rows={4}
          maxLength={800}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
        />
        <p className="field-hint">Shown on your public records.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="profile-avatar">
          Avatar URL <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          className="field"
          id="profile-avatar"
          type="url"
          maxLength={1000}
          placeholder="https://…"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
        />
        <p className="field-hint">
          Use an https image URL you control. Uploads are not available for avatars
          in the MVP.
        </p>
      </div>
      <div>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ handle }: { handle: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (confirmation !== "DELETE") return;
    if (
      !window.confirm(
        `Permanently delete @${handle} and every record, media asset, witness invitation and attestation? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setError(payload?.error?.message ?? "The account could not be deleted.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("The account could not be deleted. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-[12px] leading-6 text-muted">
        Deleting your account permanently removes your records, uploaded files,
        witness invitations and attestations. Append-only administrator audit entries
        are retained without your profile relationship. Revoking a record instead
        preserves its public evidence.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="field-label" htmlFor="delete-confirmation">
            Type DELETE to confirm
          </label>
          <input
            className="field field--compact"
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn--danger"
          type="button"
          disabled={confirmation !== "DELETE" || loading}
          onClick={() => void remove()}
        >
          {loading ? "Deleting account…" : "Delete account"}
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
