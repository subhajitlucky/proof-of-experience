import type { Metadata } from "next";
import Link from "next/link";
import { AdminRecordActions } from "@/components/admin-record-actions";
import { DemoBadge } from "@/components/demo-badge";
import { StatusPill } from "@/components/status-pill";
import {
  categoryLabel,
  formatDateTime,
  statusLabel,
  trustLabel,
  visibilityLabel,
} from "@/lib/format";
import { getAdminOverview } from "@/lib/services/admin";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registry desk",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  const flagged = overview.records.filter((record) => record.status === "flagged");
  const others = overview.records.filter((record) => record.status !== "flagged");

  return (
    <div className="wrap-wide">
      <header className="dash-head">
        <div>
          <p className="eyebrow eyebrow--accent">Registry desk</p>
          <h1 className="dash-title">Records under review.</h1>
          <p className="dash-intro">
            Review public records, flag concerns, revoke records, and restore them
            with a written reason. Every action is append-only. Record content stays
            untouched.
          </p>
        </div>
        <p className="max-w-xs text-[11px] leading-5 text-faint">
          The desk cannot edit claims or signatures. When a record&apos;s content no
          longer matches its seal, flagging it does not re-seal or repair the record.
        </p>
      </header>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__number">{overview.flaggedCount}</span>
          <span className="stat__label">Flagged now</span>
        </div>
        <div className="stat">
          <span className="stat__number">{overview.totals.published}</span>
          <span className="stat__label">In the public register</span>
        </div>
        <div className="stat">
          <span className="stat__number">{overview.totals.revoked}</span>
          <span className="stat__label">Revoked</span>
        </div>
        <div className="stat">
          <span className="stat__number">{overview.totals.attestations}</span>
          <span className="stat__label">Witness signatures</span>
        </div>
      </div>

      <section className="mt-12" aria-labelledby="flagged-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div>
            <p className="eyebrow eyebrow--accent">Attention</p>
            <h2
              className="mt-2 font-display text-[38px] leading-none"
              id="flagged-heading"
            >
              Flagged records
            </h2>
          </div>
          <span className="text-[10px] text-faint">
            {flagged.length} record{flagged.length === 1 ? "" : "s"}
          </span>
        </div>
        {flagged.length === 0 ? (
          <div className="notice mt-5">
            No records are flagged. Use the public register below to review records.
          </div>
        ) : (
          <div>
            {flagged.map((record) => (
              <div className="admin-row" key={record.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={record.status} />
                    {record.isDemo ? <DemoBadge /> : null}
                  </div>
                  <Link
                    className="mt-2 inline-block font-display text-[24px] leading-tight hover:text-vermilion-dark"
                    href={`/verify/${record.slug}`}
                  >
                    {record.title}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted">
                    By {record.creator.name}{" "}
                    <span className="text-faint">@{record.creator.handle}</span>
                  </p>
                  <p className="mt-1 text-[10px] text-faint">
                    Flagged {record.flaggedAt ? formatDateTime(record.flaggedAt) : "recently"}
                    {record.flagReason ? ` · ${record.flagReason}` : ""}
                  </p>
                </div>
                <div className="text-[11px] leading-6 text-muted">
                  <p>{categoryLabel(record.category)}</p>
                  <p>{visibilityLabel(record.visibility)}</p>
                  <p>{trustLabel(record.trustLevel)}</p>
                  <p>
                    {record._count.attestations} signatures ·{" "}
                    {record._count.claims} claims
                  </p>
                </div>
                <AdminRecordActions
                  experienceId={record.id}
                  status={record.status}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14" aria-labelledby="register-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div>
            <p className="eyebrow">Public register</p>
            <h2
              className="mt-2 font-display text-[38px] leading-none"
              id="register-heading"
            >
              All active records
            </h2>
          </div>
          <span className="text-[10px] text-faint">
            {overview.records.length} record
            {overview.records.length === 1 ? "" : "s"} · latest 50
          </span>
        </div>
        {others.length === 0 ? (
          <p className="mt-5 text-sm text-muted">No other active records.</p>
        ) : (
          <div>
            {others.map((record) => (
              <div className="admin-row" key={record.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={record.status} />
                    {record.isDemo ? <DemoBadge /> : null}
                    <span className="pill">{trustLabel(record.trustLevel)}</span>
                  </div>
                  <Link
                    className="mt-2 inline-block font-display text-[24px] leading-tight hover:text-vermilion-dark"
                    href={`/verify/${record.slug}`}
                  >
                    {record.title}
                  </Link>
                  <p className="mt-1 text-[11px] text-muted">
                    By {record.creator.name}{" "}
                    <span className="text-faint">@{record.creator.handle}</span>
                  </p>
                </div>
                <div className="text-[11px] leading-6 text-muted">
                  <p>{categoryLabel(record.category)}</p>
                  <p>{visibilityLabel(record.visibility)}</p>
                  <p>
                    {record._count.attestations} signatures ·{" "}
                    {record._count.claims} claims
                  </p>
                  <p className="text-faint">
                    {record.publishedAt
                      ? `Published ${formatDateTime(record.publishedAt)}`
                      : statusLabel(record.status)}
                  </p>
                </div>
                <AdminRecordActions
                  experienceId={record.id}
                  status={record.status}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-16" aria-labelledby="audit-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div>
            <p className="eyebrow">Append-only ledger</p>
            <h2
              className="mt-2 font-display text-[38px] leading-none"
              id="audit-heading"
            >
              Administrator audit log
            </h2>
          </div>
          <span className="text-[10px] text-faint">Latest 50 actions</span>
        </div>
        <p className="mt-4 max-w-2xl text-[11px] leading-5 text-faint">
          A PostgreSQL trigger rejects updates and deletes on this table. Entries
          include the acting administrator, target record, reason and other
          non-private metadata.
        </p>
        {overview.auditLog.length === 0 ? (
          <div className="notice mt-5">
            No administrative actions have been recorded yet.
          </div>
        ) : (
          <div className="mt-4 border-t border-rule">
            {overview.auditLog.map((entry) => (
              <div className="audit-row" key={entry.id}>
                <span className="audit-action">{entry.action}</span>
                <div>
                  <p className="text-[12px] text-ink-soft">
                    <span className="font-semibold">{entry.actorName}</span>{" "}
                    {entry.action === "flag"
                      ? "flagged"
                      : entry.action === "unflag"
                        ? "unflagged"
                        : entry.action === "revoke"
                          ? "revoked"
                          : "restored"}{" "}
                    record{" "}
                    <span className="hash--short text-faint">
                      {entry.targetId.slice(0, 12)}…
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    {entry.reason}
                  </p>
                </div>
                <span className="text-[10px] text-faint">
                  {formatDateTime(entry.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-[10px] leading-5 text-faint">
        Demo note: seeded demo records are fictional. Administrator account
        credentials are documented only in the local README.
      </p>
    </div>
  );
}
