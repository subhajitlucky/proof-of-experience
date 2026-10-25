import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { DeleteAccountForm, ProfileForm } from "@/components/account-forms";
import { Avatar } from "@/components/identity";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow eyebrow--accent">Account</p>
        <h1 className="page-title">Settings.</h1>
        <p className="page-intro">
          Your public identity, signing material and account controls. Only your
          name, handle, bio and avatar appear on public records.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Public profile</p>
              <h2 className="mt-2 font-display text-[28px] leading-none">
                How verifiers see you
              </h2>
            </div>
            <Avatar name={user.name} src={user.avatarUrl} large />
          </div>
          <div className="panel__body">
            <ProfileForm
              initial={{
                name: user.name,
                handle: user.handle,
                bio: user.bio ?? "",
                avatarUrl: user.avatarUrl ?? "",
              }}
            />
          </div>
        </section>

        <aside className="stack--sm">
          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Identity</p>
                <h2 className="mt-2 font-display text-[24px] leading-none">
                  Account facts
                </h2>
              </div>
            </div>
            <div className="panel__body">
              <dl className="inline-dl">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Handle</dt>
                  <dd>@{user.handle}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{user.role}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Keys</p>
                <h2 className="mt-2 font-display text-[24px] leading-none">
                  Public key
                </h2>
              </div>
            </div>
            <div className="panel__body">
              <p className="text-[11px] leading-5 text-muted">
                A profile Ed25519 keypair is generated for future creator-held
                signing. Records in this MVP are currently sealed with the
                server-held record key. The map to self-custody is documented in the
                README.
              </p>
              <p className="hash mt-3">{user.publicKey}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CopyButton
                  value={user.publicKey}
                  label="Copy public key"
                  className="btn btn--outline btn--sm"
                />
                <Link className="btn btn--quiet btn--sm" href="/dashboard">
                  Back to records
                </Link>
              </div>
            </div>
          </section>

          <section className="destructive-zone">
            <div className="panel__header">
              <div>
                <p className="eyebrow eyebrow--accent">Danger zone</p>
                <h2 className="mt-2 font-display text-[24px] leading-none">
                  Delete account
                </h2>
              </div>
            </div>
            <div className="panel__body">
              <DeleteAccountForm handle={user.handle} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
