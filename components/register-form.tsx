"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface ErrorDetails {
  path?: string;
  message: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ErrorDetails[]>([]);

  function updateName(value: string) {
    setName(value);
    if (!handleTouched) {
      const generated = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 30);
      setHandle(generated);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDetails([]);
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, handle, email, password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: {
              message?: string;
              details?: Array<{ path?: string; message?: string }>;
            };
          }
        | null;
      if (!response.ok) {
        setError(payload?.error?.message ?? "Account could not be created.");
        setDetails(
          (payload?.error?.details ?? [])
            .filter((entry): entry is { path?: string; message: string } =>
              Boolean(entry.message),
            )
            .slice(0, 5),
        );
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (!signInResult?.ok) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Account could not be created. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <p className="eyebrow eyebrow--accent">Open a record book</p>
      <h1 className="mt-4">Make your first record.</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Start with a draft. Add evidence and witnesses before you publish anything.
      </p>

      <form className="mt-8 stack--sm" onSubmit={onSubmit}>
        {error ? (
          <div className="form-error" role="alert">
            <p>{error}</p>
            {details.length > 0 ? (
              <ul>
                {details.map((entry, index) => (
                  <li key={`${entry.path ?? "field"}-${index}`}>
                    {entry.path ? `${entry.path}: ` : ""}
                    {entry.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="field-label" htmlFor="register-name">
            Your name
          </label>
          <input
            className="field"
            id="register-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => updateName(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="register-handle">
            Public handle
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint">
              @
            </span>
            <input
              className="field pl-7"
              id="register-handle"
              name="handle"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={handle}
              onChange={(event) => {
                setHandleTouched(true);
                setHandle(
                  event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                );
              }}
            />
          </div>
          <p className="field-hint">Lowercase letters, numbers and hyphens.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="register-email">
            Email
          </label>
          <input
            className="field"
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="register-password">
            Password
          </label>
          <input
            className="field"
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={200}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="field-hint">At least 8 characters.</p>
        </div>
        <button className="btn btn--primary w-full" type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
          {!loading ? (
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </button>
      </form>

      <p className="mt-8 border-t border-rule pt-5 text-xs text-muted">
        Already have a record book?{" "}
        <Link className="link" href="/login">
          Sign in
        </Link>
        .
      </p>
      <p className="mt-3 text-[11px] leading-5 text-faint">
        Accounts are for the MVP demo. Your signing keys are generated server-side
        and held encrypted. Self-custodied keys are a documented future step.
      </p>
    </div>
  );
}
