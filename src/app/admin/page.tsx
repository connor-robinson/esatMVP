"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";

type Overview = {
  openSupport: number;
  activePartners: number;
  partnerEntitlements: number;
  currentlyTrialing: number;
  cancelsEver: number;
};

const CARDS: Array<{
  href: string;
  title: string;
  body: string;
  key: keyof Overview | null;
  suffix?: string;
}> = [
  {
    href: "/admin/cohorts",
    title: "Cohorts",
    body: "Arkwright, Elephant, Other, and all-user usage stats.",
    key: null,
  },
  {
    href: "/admin/support",
    title: "Support",
    body: "Open Help tickets and legacy /help reports in one inbox.",
    key: "openSupport",
    suffix: "open",
  },
  {
    href: "/admin/partners",
    title: "Access",
    body: "Partner invites, cohort codes, and complimentary seats.",
    key: "partnerEntitlements",
    suffix: "seats",
  },
  {
    href: "/admin/billing",
    title: "Billing",
    body: "Free trial history and who cancelled.",
    key: "currentlyTrialing",
    suffix: "trialing",
  },
  {
    href: "/admin/emails",
    title: "Emails",
    body: "Tips and Tricks opt-in stats and product email sends.",
    key: null,
  },
];

export default function AdminOverviewPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <Container size="md" className="py-16">
        <p className="text-sm text-text-muted">Admin only.</p>
      </Container>
    );
  }

  return (
    <Container size="lg" className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Admin</h1>
          <p className="mt-1 text-sm text-text-muted">
            Cohorts, support, access, and billing in one place.
          </p>
        </div>
        {!loading && data ? (
          <p className="text-xs text-text-subtle">
            {data.cancelsEver} cancels recorded · {data.activePartners} active
            partners
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-organic-xl bg-surface-elevated px-5 py-5 transition-colors hover:bg-surface-mid"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold text-text">
                  {card.title}
                </h2>
                {card.key && data ? (
                  <span className="rounded-organic-md bg-secondary/20 px-2 py-1 text-xs font-semibold text-text">
                    {data[card.key]} {card.suffix}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-text-muted">{card.body}</p>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
