"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useOptionalSupport } from "@/components/support/SupportProvider";
import { trackEvent } from "@/lib/ga/trackEvent";
import { cn } from "@/lib/utils";

interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
  subject?: string;
  questionId?: string;
  paperId?: string;
}

/**
 * Legacy modal entry for “Report a bug”. Opens the shared support panel with
 * Technical problem preselected so we do not maintain a second form.
 */
export function BugReportModal({
  open,
  onClose,
  subject = "Past paper player",
  questionId,
  paperId,
}: BugReportModalProps) {
  const session = useSupabaseSession();
  const support = useOptionalSupport();
  const pathname = usePathname();
  const loginHref = `/login?redirectTo=${encodeURIComponent(pathname || "/past-papers/library")}`;
  const handedOff = useRef(false);

  useEffect(() => {
    if (!open) {
      handedOff.current = false;
      return;
    }
    if (!session?.user || !support || handedOff.current) return;
    handedOff.current = true;
    trackEvent("support_opened", { placement: "bug_report_modal" });
    support.openSupport({
      category: "technical_problem",
      subject,
      questionId,
      paperId,
    });
    onClose();
  }, [open, session?.user, support, subject, questionId, paperId, onClose]);

  if (!open) return null;

  // Authenticated handoff: support panel owns the UI.
  if (session?.user && support) {
    return null;
  }

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
          Sign in to send a support request. We usually reply within 24 hours.
        </p>
        <div className="mt-5">
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
      </div>
    </div>
  );
}
