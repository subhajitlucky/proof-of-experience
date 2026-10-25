"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="wrap flex min-h-svh items-center py-20">
      <div className="max-w-2xl">
        <p className="eyebrow eyebrow--accent">Unexpected error</p>
        <h1 className="mt-5 font-display text-[clamp(44px,7vw,80px)] leading-[0.95] tracking-[-0.04em]">
          The record could not be opened.
        </h1>
        <p className="mt-6 max-w-lg text-sm leading-6 text-muted">
          An unexpected error interrupted this page. You can try again. If the
          problem continues, the record may need to be recreated.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="btn btn--primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="btn btn--outline" href="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
