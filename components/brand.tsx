import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand__seal" aria-hidden="true">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
          <rect
            x="2.75"
            y="2.75"
            width="18.5"
            height="18.5"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M7.2 17V7h4.35a3 3 0 0 1 0 6H7.2"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="square"
          />
          <rect x="15.4" y="15.4" width="3" height="3" fill="currentColor" />
        </svg>
      </span>
      <span className="brand__text">
        <span className="brand__name">Proof of Experience</span>
        <span className="brand__sub">Evidence registry</span>
      </span>
    </Link>
  );
}
