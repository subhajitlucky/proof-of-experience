import Link from "next/link";
import { Brand } from "./brand";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="site-header__micro">
        <div className="wrap-wide flex items-center justify-between gap-6">
          <span>Public evidence registry · access copy</span>
          <span className="site-header__micro-alt">Ed25519 / SHA-256 / witness attested</span>
        </div>
      </div>
      <div className="site-header__inner wrap-wide">
        <Brand />
        <nav aria-label="Primary" className="site-nav">
          <Link href="/#how-it-works" className="nav-link site-header__optional site-header__optional--md">
            Method
          </Link>
          <Link href="/#scope" className="nav-link site-header__optional site-header__optional--lg">
            Scope
          </Link>
          <Link href="/#cases" className="nav-link site-header__optional site-header__optional--sm">
            Case index
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">
                Records
              </Link>
              <Link href="/dashboard/new" className="btn btn--header site-header__cta">
                New record
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Sign in
              </Link>
              <Link href="/register" className="btn btn--header site-header__cta">
                Open a record
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
