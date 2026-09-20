"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

type Engagement = {
  emailsSent: number;
  campaignsSent: number;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
  open_rate: number;
  click_rate: number;
};

type AbVariant = {
  variant: "a" | "b";
  subject: string;
  sentCount: number;
  failedCount: number;
  openCount: number;
  uniqueOpeners: number;
  clickCount: number;
  uniqueClickers: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
};

type AbStats = {
  enabled: boolean;
  variants: AbVariant[];
};

type CampaignRow = {
  id: string;
  subject: string;
  subject_b?: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  created_at: string;
  open_count: number;
  unique_openers: number;
  click_count: number;
  unique_clickers: number;
  unsubscribe_count: number;
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
  ab?: AbStats | null;
};

type LinkStat = {
  destinationUrl: string;
  clickCount: number;
  uniqueClickers: number;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-organic-lg bg-surface-elevated px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text">{value}</p>
    </div>
  );
}

function pct(n: number): string {
  return `${n}%`;
}

export default function AdminEmailAnalyticsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkStat[]>([]);
  const [selectedAb, setSelectedAb] = useState<AbStats | null>(null);
  const [linksLoading, setLinksLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/emails/analytics", {
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof json.error === "string" ? json.error : "Failed to load",
      );
      setLoading(false);
      return;
    }
    setEngagement((json.engagement ?? null) as Engagement | null);
    setCampaigns((json.campaigns ?? []) as CampaignRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setLinks([]);
      setSelectedAb(null);
      return;
    }
    let cancelled = false;
    setLinksLoading(true);
    void (async () => {
      const res = await fetch(
        `/api/admin/emails/analytics?campaignId=${encodeURIComponent(selectedId)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok) {
        setLinks((json.links ?? []) as LinkStat[]);
        setSelectedAb((json.ab ?? null) as AbStats | null);
      } else {
        setLinks([]);
        setSelectedAb(null);
      }
      setLinksLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;
  const abToShow =
    selectedAb?.enabled
      ? selectedAb
      : selected?.ab?.enabled
        ? selected.ab
        : null;

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-text-muted">
            <Link
              href="/admin/emails"
              className="underline-offset-2 hover:text-text hover:underline"
            >
              Product emails
            </Link>
            <span className="mx-1.5 text-text-subtle">/</span>
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-text">
            Email tracking
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Opens, clicks, A/B subjects, and per-link performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-organic-md bg-surface-mid px-3 py-1.5 text-sm font-semibold text-text"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Emails sent" value={engagement?.emailsSent ?? 0} />
            <Stat
              label="Unique opens"
              value={engagement?.uniqueOpeners ?? 0}
            />
            <Stat
              label="Open rate"
              value={pct(engagement?.open_rate ?? 0)}
            />
            <Stat
              label="Click rate"
              value={pct(engagement?.click_rate ?? 0)}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total opens" value={engagement?.openCount ?? 0} />
            <Stat label="Link clicks" value={engagement?.clickCount ?? 0} />
            <Stat
              label="People who clicked"
              value={engagement?.uniqueClickers ?? 0}
            />
            <Stat
              label="Unsubscribed via email"
              value={engagement?.unsubscribeCount ?? 0}
            />
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-text">Campaigns</h2>
            <div className="mt-3 overflow-x-auto rounded-organic-xl bg-surface-elevated">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Opens</th>
                    <th className="px-4 py-3 font-medium">Open %</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Click %</th>
                    <th className="px-4 py-3 font-medium">CTOR</th>
                    <th className="px-4 py-3 font-medium">Unsub</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        "border-t border-border-subtle cursor-pointer",
                        selectedId === c.id
                          ? "bg-secondary/15"
                          : "hover:bg-surface-mid/60",
                      )}
                      onClick={() =>
                        setSelectedId((prev) =>
                          prev === c.id ? null : c.id,
                        )
                      }
                    >
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {new Date(c.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-2.5 text-text">
                        {c.subject_b ? (
                          <span>
                            <span className="mr-1.5 rounded-organic-md bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                              A/B
                            </span>
                            <span className="block text-xs text-text-muted">
                              A: {c.subject}
                            </span>
                            <span className="block text-xs text-text-muted">
                              B: {c.subject_b}
                            </span>
                          </span>
                        ) : (
                          c.subject
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.sent_count}/{c.recipient_count}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unique_openers}
                        <span className="text-text-subtle">
                          {" "}
                          ({c.open_count})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {pct(c.open_rate)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unique_clickers}
                        <span className="text-text-subtle">
                          {" "}
                          ({c.click_count})
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {pct(c.click_rate)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {pct(c.click_to_open_rate)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">
                        {c.unsubscribe_count}
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-sm text-text-muted"
                      >
                        No sent campaigns yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-text-subtle">
              Click a campaign to see A/B results and link clicks. Open rates
              can be inflated by privacy proxies in some inboxes.
            </p>
          </section>

          {selected && abToShow ? (
            <section className="mt-8 rounded-organic-xl bg-surface-elevated px-5 py-5">
              <h2 className="text-sm font-semibold text-text">
                Subject A/B results
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {abToShow.variants.map((v) => (
                  <div
                    key={v.variant}
                    className="rounded-organic-lg bg-surface-mid px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      Subject {v.variant.toUpperCase()}
                    </p>
                    <p className="mt-2 text-sm font-medium text-text">
                      {v.subject}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Stat label="Sent" value={v.sentCount} />
                      <Stat label="Open %" value={pct(v.openRate)} />
                      <Stat label="Unique opens" value={v.uniqueOpeners} />
                      <Stat label="Click %" value={pct(v.clickRate)} />
                      <Stat label="Unique clicks" value={v.uniqueClickers} />
                      <Stat label="Unsub" value={v.unsubscribeCount} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {selected ? (
            <section className="mt-8 rounded-organic-xl bg-surface-elevated px-5 py-5">
              <h2 className="text-sm font-semibold text-text">
                Links in “{selected.subject}”
              </h2>
              {linksLoading ? (
                <p className="mt-3 text-sm text-text-muted">Loading links…</p>
              ) : links.length === 0 ? (
                <p className="mt-3 text-sm text-text-muted">
                  No clicks recorded for this campaign yet.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-wide text-text-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">URL</th>
                        <th className="py-2 pr-3 font-medium">Clicks</th>
                        <th className="py-2 font-medium">People</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((link) => (
                        <tr
                          key={link.destinationUrl}
                          className="border-t border-border-subtle"
                        >
                          <td className="py-2.5 pr-3 break-all text-text">
                            {link.destinationUrl}
                          </td>
                          <td className="py-2.5 pr-3 tabular-nums text-text-muted">
                            {link.clickCount}
                          </td>
                          <td className="py-2.5 tabular-nums text-text-muted">
                            {link.uniqueClickers}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </Container>
  );
}
