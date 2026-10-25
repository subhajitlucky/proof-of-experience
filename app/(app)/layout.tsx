import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader user={user} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mt-24 border-t border-rule">
        <div className="wrap-wide flex flex-wrap items-center justify-between gap-3 py-6 text-[10px] uppercase tracking-[0.12em] text-faint">
          <span>Proof of Experience · evidence &amp; attestation</span>
          <span>Evidence, not truth.</span>
        </div>
      </footer>
    </div>
  );
}
