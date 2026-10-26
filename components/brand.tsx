import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand__seal" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3.5 5.5h7l2-2h8v17h-17z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M7 9h10M7 12.5h10M7 16h6"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <rect x="15.5" y="15" width="3.5" height="3.5" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__text">
        <span className="brand__name">Proof of Experience</span>
        <span className="brand__sub">Public evidence registry</span>
      </span>
    </Link>
  );
}
