"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    match: (p: string) => p.startsWith("/admin/support"),
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
] as const;

const SECONDARY = [
  { href: "/admin/inbox", label: "Messages" },
  { href: "/admin/founding-tester", label: "Founding tester" },
  { href: "/admin/feedback-referral", label: "Feedback referral" },
  { href: "/admin/mock-builder", label: "Mock builder" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/admin";

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
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-organic-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary/25 text-text"
                        : "text-text-muted hover:bg-surface-mid hover:text-text",
                    )}
                  >
                    {item.label}
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
