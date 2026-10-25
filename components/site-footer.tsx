import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner wrap">
        <div>
          <Brand />
          <p className="footer-note mt-5">
            An evidence and attestation layer for human-lived experience. A seal
            establishes record integrity and signer custody. It does not establish
            that every statement is true, and it is not a legal signature.
          </p>
        </div>
        <div className="sm:justify-self-end">
          <p className="eyebrow mb-3">The record</p>
          <nav aria-label="Footer" className="flex flex-col items-start gap-2 text-xs">
            <Link className="link" href="/#scope">
              What this proves
            </Link>
            <Link className="link" href="/verify/demo-kyoto-raku">
              View a demo record
            </Link>
            <Link className="link" href="/login">
              Sign in
            </Link>
          </nav>
          <p className="mt-5 text-[10px] uppercase tracking-[0.14em] text-faint">
            Evidence, not truth.
          </p>
        </div>
      </div>
    </footer>
  );
}
