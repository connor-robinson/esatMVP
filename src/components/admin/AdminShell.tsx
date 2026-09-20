"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import { ADMIN_BADGES_REFRESH_EVENT } from "@/lib/admin/adminBadges";
import {
  FEEDBACK_ADMIN_VIEWED_EVENT,
  getFeedbackAdminLastSeenAt,
} from "@/lib/admin/feedbackReferralLastSeen";

const PRIMARY = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  {
    href: "/admin/cohorts",
    label: "Cohorts",
    match: (p: string) => p.startsWith("/admin/cohorts"),
  },
  {
    href: "/admin/support",
    label: "Support",
    match: (p: string) =>
      p.startsWith("/admin/support") || p.startsWith("/admin/inbox"),
  },
  {
    href: "/admin/partners",
    label: "Access",
    match: (p: string) => p.startsWith("/admin/partners"),
  },
  {
    href: "/admin/billing",
    label: "Billing",
    match: (p: string) => p.startsWith("/admin/billing"),
  },
  {
    href: "/admin/emails",
    label: "Emails",
    match: (p: string) =>
      p.startsWith("/admin/emails") && !p.startsWith("/admin/emails/analytics"),
  },
  {
    href: "/admin/emails/analytics",
    label: "Email tracking",
    match: (p: string) => p.startsWith("/admin/emails/analytics"),
  },
  {
    href: "/admin/surveys",
    label: "Surveys",
    match: (p: string) => p.startsWith("/admin/surveys"),
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    match: (p: string) =>
      p.startsWith("/admin/feedback") ||
      p.startsWith("/admin/feedback-referral"),
  },
  {
    href: "/admin/question-bank",
    label: "Question bank",
    match: (p: string) => p.startsWith("/admin/question-bank"),
  },
  {
    href: "/admin/past-papers",
    label: "Past papers",
    match: (p: string) => p.startsWith("/admin/past-papers"),
  },
  {
    href: "/admin/question-reports",
    label: "QB reports",
    match: (p: string) => p.startsWith("/admin/question-reports"),
  },
  {
    href: "/admin/mock-builder",
    label: "Mocks",
    match: (p: string) => p.startsWith("/admin/mock-builder"),
  },
  {
    href: "/admin/mock-stats",
    label: "Mock stats",
    match: (p: string) => p.startsWith("/admin/mock-stats"),
  },
] as const;

const SECONDARY = [
  { href: "/mental-maths/fermiguessr/preview", label: "Fermi preview" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [supportBadge, setSupportBadge] = useState(0);
  const [feedbackBadge, setFeedbackBadge] = useState(0);
  const [reportsBadge, setReportsBadge] = useState(0);

  const loadBadge = useCallback(async () => {
    try {
      const [supportRes, feedbackRes, reportsRes] = await Promise.all([
        fetch("/api/admin/support/notifications", { cache: "no-store" }),
        fetch(
          (() => {
            const since = getFeedbackAdminLastSeenAt();
            const qs = since
              ? `?since=${encodeURIComponent(since)}`
              : "";
            return `/api/admin/feedback-referral/notifications${qs}`;
          })(),
          { cache: "no-store" },
        ),
        fetch("/api/admin/question-reports/notifications", {
          cache: "no-store",
        }),
      ]);
      if (supportRes.ok) {
        const json = await supportRes.json();
        setSupportBadge(Number(json.notifications?.total ?? 0));
      }
      if (feedbackRes.ok) {
        const json = await feedbackRes.json();
        setFeedbackBadge(Number(json.notifications?.total ?? 0));
      }
      if (reportsRes.ok) {
        const json = await reportsRes.json();
        setReportsBadge(Number(json.notifications?.total ?? 0));
      }
    } catch {
      // ignore badge failures
    }
  }, []);

  useEffect(() => {
    void loadBadge();
    const id = window.setInterval(() => void loadBadge(), 60_000);
    const onRefresh = () => void loadBadge();
    window.addEventListener(FEEDBACK_ADMIN_VIEWED_EVENT, onRefresh);
    window.addEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(FEEDBACK_ADMIN_VIEWED_EVENT, onRefresh);
      window.removeEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
    };
  }, [loadBadge]);

  useEffect(() => {
    void loadBadge();
  }, [pathname, loadBadge]);

  // Full-bleed Pearson / exam chrome: no admin nav.
  const chromeLess =
    /\/admin\/mock-builder\/[^/]+\/preview\/?$/.test(pathname);

  if (chromeLess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border-subtle bg-surface-elevated">
        <Container size="lg" className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href="/admin"
                className="mr-2 text-sm font-semibold tracking-tight text-text"
              >
                Admin
              </Link>
              {PRIMARY.map((item) => {
                const active = item.match(pathname);
                const badgeCount =
                  item.href === "/admin/support"
                    ? supportBadge
                    : item.href === "/admin/feedback"
                      ? feedbackBadge
                      : item.href === "/admin/question-reports"
                        ? reportsBadge
                        : 0;
                const showBadge = badgeCount > 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-organic-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary/25 text-text"
                        : "text-text-muted hover:bg-surface-mid hover:text-text",
                    )}
                  >
                    {item.label}
                    {showBadge ? (
                      <span className="rounded-full bg-secondary/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-text">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
              {SECONDARY.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "underline-offset-2 hover:text-text hover:underline",
                    pathname.startsWith(item.href) && "text-text",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </Container>
      </header>
      {children}
    </div>
  );
}
