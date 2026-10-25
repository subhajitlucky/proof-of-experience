import Link from "next/link";

export function NotFoundContent() {
  return (
    <section className="wrap flex min-h-[55svh] items-center py-20">
      <div className="max-w-2xl">
        <p className="eyebrow eyebrow--accent">404 · Not found</p>
        <h1 className="mt-5 font-display text-[clamp(48px,8vw,96px)] leading-[0.94] tracking-[-0.05em]">
          This page is not in the record.
        </h1>
        <p className="mt-6 max-w-lg text-sm leading-6 text-muted">
          The page may have been removed, the record may be private or unpublished,
          or the verification link may be incorrect.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn btn--primary" href="/">
            Return home
          </Link>
          <Link className="btn btn--outline" href="/verify/demo-kyoto-raku">
            View a demo record
          </Link>
        </div>
      </div>
    </section>
  );
}
