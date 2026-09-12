"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory } from "@/lib/support";

interface Row {
  id: string;
  user_id: string | null;
  reply_email: string;
  category: SupportCategory | "legacy_help" | string;
  subject: string;
  message: string;
  page_url: string | null;
  status: string;
  email_delivery_status: string;
  created_at: string;
  context: Record<string, string> | null;
  source?: "support" | "legacy_bug";
}

function categoryLabel(category: string): string {
  if (category === "legacy_help") return "Legacy help / bug form";
  return SUPPORT_CATEGORY_LABELS[category as SupportCategory] ?? category;
}

function TicketCard({ row }: { row: Row }) {
  const isLegacy = row.source === "legacy_bug" || row.category === "legacy_help";
  return (
    <article className="rounded-organic-xl bg-surface-elevated px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            {categoryLabel(row.category)}
            {isLegacy ? " · pre-Help launcher" : ""}
          </p>
          <h2 className="mt-1 font-heading text-lg font-semibold text-text">
            {row.subject}
          </h2>
        </div>
        <p className="font-mono text-xs text-text-subtle">
          {row.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
        {row.message}
      </p>
      <dl className="mt-4 grid gap-1 text-xs text-text-subtle sm:grid-cols-2">
        {row.reply_email ? (
          <div>
            <dt className="inline text-text-muted">Reply: </dt>
            <dd className="inline">
              <a
                href={`mailto:${row.reply_email}`}
                className="underline-offset-2 hover:underline"
              >
                {row.reply_email}
              </a>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="inline text-text-muted">Created: </dt>
          <dd className="inline">
            {new Date(row.created_at).toLocaleString("en-GB")}
          </dd>
        </div>
        {!isLegacy ? (
          <div>
            <dt className="inline text-text-muted">Email: </dt>
            <dd className="inline">{row.email_delivery_status}</dd>
          </div>
        ) : null}
        {row.page_url ? (
          <div className="sm:col-span-2">
            <dt className="inline text-text-muted">Page: </dt>
            <dd className="inline break-all">{row.page_url}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export default function AdminSupportPage() {
  const [forbidden, setForbidden] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [legacyRows, setLegacyRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");

  useEffect(() => {
    void fetch(`/api/admin/support?status=${filter}`).then(async (res) => {
      if (res.status === 403 || res.status === 401) {
        setForbidden(true);
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setLegacyRows(data.legacyRows ?? []);
    });
  }, [filter]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Support requests</h1>
          <p className="mt-2 text-sm text-text-muted">
            Help launcher tickets plus legacy /help bug reports. Reply from{" "}
            <a
              href="mailto:esatcamp@gmail.com"
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              esatcamp@gmail.com
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/admin/inbox"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Inbox
          </Link>
          <Link
            href="/admin/founding-tester"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Founding tester
          </Link>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "open" | "all")}
            className="rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
            aria-label="Filter by status"
          >
            <option value="open">Open</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Help launcher ({rows.length})
        </h2>
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <TicketCard key={row.id} row={row} />
          ))}
          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">No support requests yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-muted">
          Legacy /help reports ({legacyRows.length})
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Older form submissions (refunds, queries, bugs) stored in{" "}
          <span className="font-mono text-xs">app_bug_reports</span>.
        </p>
        <div className="mt-4 space-y-4">
          {legacyRows.map((row) => (
            <TicketCard key={row.id} row={row} />
          ))}
          {legacyRows.length === 0 ? (
            <p className="text-sm text-text-muted">No legacy reports.</p>
          ) : null}
        </div>
      </section>
    </Container>
  );
}
