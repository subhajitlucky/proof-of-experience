import Link from "next/link";
import { Brand } from "./brand";
import { getCurrentUser } from "@/lib/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="site-header">
      <div className="site-header__inner wrap">
        <Brand />
        <nav aria-label="Primary" className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
          <Link href="/#how-it-works" className="nav-link site-header__optional site-header__optional--md">
            How it works
          </Link>
          <Link href="/#scope" className="nav-link site-header__optional site-header__optional--lg">
            What it proves
          </Link>
          <Link href="/verify/demo-kyoto-raku" className="nav-link site-header__optional site-header__optional--sm">
            Demo record
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link href="/dashboard/new" className="btn btn--primary btn--sm site-header__cta">
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
              <Link href="/register" className="btn btn--primary btn--sm site-header__cta">
                Create a record
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
