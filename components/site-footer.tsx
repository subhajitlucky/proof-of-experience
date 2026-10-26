import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <div className="site-footer__brand">
          <Brand />
          <p className="footer-statement">Evidence,<br />not truth.</p>
        </div>
        <div className="site-footer__copy">
          <div>
            <p className="eyebrow">Registry notice</p>
            <p className="footer-note mt-3">
              A seal establishes record integrity and signer custody. It does not
              establish that every statement is true, and it is not a legal
              signature. Exact witness email addresses and private coordinates are
              never published.
            </p>
          </div>
          <div className="site-footer__links">
            <div>
              <p className="eyebrow mb-3">Inspect</p>
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
            </div>
            <div>
              <p className="eyebrow mb-3">Format</p>
              <p className="text-[11px] leading-5 text-[rgba(245,248,241,0.58)]">
                POE / evidence record<br />
                Ed25519 seal<br />
                SHA-256 evidence chain
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom wrap">
        <span>Proof of Experience · Public evidence registry</span>
        <span>Record the evidence. Explain the criteria.</span>
      </div>
    </footer>
  );
}
