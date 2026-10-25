"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm({
  callbackUrl,
  googleEnabled,
}: {
  callbackUrl: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result?.ok) {
        setError("Email or password not recognised. Try the demo credentials below.");
        return;
      }
      router.push(result.url ?? callbackUrl);
      router.refresh();
    } catch {
      setError("Sign-in could not be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function useDemoCredentials() {
    setEmail("demo@proofofexperience.local");
    setPassword("demo1234");
    setError(null);
  }

  return (
    <div className="auth-card">
      <p className="eyebrow eyebrow--accent">Creator &amp; registry access</p>
      <h1 className="mt-4">Sign in.</h1>
      <p className="mt-4 text-sm leading-6 text-muted">
        Open your record book, invite witnesses, and inspect the evidence behind
        each public record.
      </p>

      <form className="mt-8 stack--sm" onSubmit={onSubmit}>
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
        <div>
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <input
            className="field"
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <input
            className="field"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <button className="btn btn--primary w-full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
          {!loading ? (
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          ) : null}
        </button>
      </form>

      <div className="credential-card mt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">Demo account</p>
          <button className="textlink" type="button" onClick={useDemoCredentials}>
            Fill credentials
          </button>
        </div>
        <div className="mt-3">
          <div className="credential-card__line">
            <span>Email</span>
            <span>demo@proofofexperience.local</span>
          </div>
          <div className="credential-card__line">
            <span>Password</span>
            <span>demo1234</span>
          </div>
        </div>
      </div>

      {googleEnabled ? (
        <button
          className="btn btn--outline mt-4 w-full"
          type="button"
          onClick={() => void signIn("google", { callbackUrl })}
        >
          Continue with Google
        </button>
      ) : null}

      <p className="mt-8 border-t border-rule pt-5 text-xs text-muted">
        New here?{" "}
        <Link className="link" href="/register">
          Create an account
        </Link>
        .
      </p>
      <p className="mt-3 text-[11px] leading-5 text-faint">
        A signature establishes record integrity and signer custody. It is not a
        legal signature or a promise that the account is true.
      </p>
    </div>
  );
}
