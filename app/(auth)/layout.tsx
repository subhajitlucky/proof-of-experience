import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-paper">
      <div className="auth-mobile-brand">
        <Brand />
      </div>
      <div className="auth-shell">
        <aside className="auth-brand">
          <Brand />
          <div className="auth-brand__quote">
            <p>A record is only as credible as the evidence a reader can inspect.</p>
          </div>
          <p className="auth-brand__foot">
            Signed records. Hash-chained evidence. Witness-attested claims. No claim
            of absolute truth.
          </p>
          <span className="auth-brand__stamp" aria-hidden="true" />
        </aside>
        <main id="main" className="auth-main">
          {children}
        </main>
      </div>
    </div>
  );
}
