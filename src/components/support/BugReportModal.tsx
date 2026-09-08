"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { BugReportPanel } from "@/components/profile/BugReportPanel";
import { cn } from "@/lib/utils";

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
  subject?: string;
}

export function BugReportModal({
  open,
  onClose,
  subject = "Past paper player",
}: BugReportModalProps) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const loginHref = `/login?redirectTo=${encodeURIComponent(pathname || "/past-papers/library")}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        className="relative w-full max-w-md rounded-organic-xl bg-surface-elevated p-6 shadow-modal-card sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
          aria-label="Close"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <h2
          id="bug-report-title"
          className="pr-8 font-heading text-xl font-bold text-text"
        >
          Report a bug
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Tell us what went wrong in the past paper player. A screenshot
          description and the question number help a lot.
        </p>
        <div className="mt-5">
          {session?.user ? (
            <BugReportPanel subject={subject} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Sign in to send a bug report.
              </p>
              <Link
                href={loginHref}
                className={cn(
                  "inline-flex items-center justify-center rounded-organic-md bg-primary px-5 py-3",
                  "text-sm font-semibold text-background transition-opacity hover:opacity-90",
                )}
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
