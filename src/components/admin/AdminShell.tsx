"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

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
    match: (p: string) => p.startsWith("/admin/emails"),
  },
  {
    href: "/admin/surveys",
    label: "Surveys",
    match: (p: string) => p.startsWith("/admin/surveys"),
  },
] as const;

const SECONDARY = [
  { href: "/admin/mock-builder", label: "Mock builder" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";
  const [supportBadge, setSupportBadge] = useState(0);

  const loadBadge = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/support/notifications", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setSupportBadge(Number(json.notifications?.total ?? 0));
    } catch {
      // ignore badge failures
    }
  }, []);

  useEffect(() => {
    void loadBadge();
    const id = window.setInterval(() => void loadBadge(), 60_000);
    return () => window.clearInterval(id);
  }, [loadBadge]);

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
                const showBadge = item.href === "/admin/support" && supportBadge > 0;
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
                        {supportBadge > 99 ? "99+" : supportBadge}
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
