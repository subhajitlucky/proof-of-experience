"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const current = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
      ? "page"
      : undefined;

  return (
    <nav aria-label="Account" className="app-nav">
      <Link href="/dashboard" className="nav-link" aria-current={current("/dashboard")}>
        Records
      </Link>
      {isAdmin ? (
        <Link href="/admin" className="nav-link" aria-current={current("/admin")}>
          Registry
        </Link>
      ) : null}
      <Link href="/settings" className="nav-link" aria-current={current("/settings")}>
        Settings
      </Link>
      <Link href="/dashboard/new" className="btn btn--primary btn--sm">
        New record
      </Link>
    </nav>
  );
}
