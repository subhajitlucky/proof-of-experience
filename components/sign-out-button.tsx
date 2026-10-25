"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "nav-link" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}
