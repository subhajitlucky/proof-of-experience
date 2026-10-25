import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand__seal" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M7 18V6h5.1c3 0 4.9 1.8 4.9 4.4 0 2.7-1.9 4.5-5 4.5h-2.2V18H7ZM9.8 12h2.1c1.6 0 2.4-.6 2.4-1.7 0-1-.8-1.6-2.4-1.6H9.8V12Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="brand__text">
        <span className="brand__name">Proof of Experience</span>
        <span className="brand__sub">Evidence &amp; attestation</span>
      </span>
    </Link>
  );
}
