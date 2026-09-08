"use client";

import { useEffect, useState } from "react";
import { BugReportModal } from "@/components/support/BugReportModal";

const DISMISS_KEY = "esatcamp.pastPaperUatNotice.dismissed.v1";

/**
 * Library notice: the sitting UI now follows UAT-UK, plus a one-click bug report.
 */
export function PastPaperUatNotice() {
  const [visible, setVisible] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible && !reportOpen) return null;

  return (
    <>
      {visible ? (
        <div className="mb-5 rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6 sm:py-5">
          <p className="font-heading text-base font-bold text-text sm:text-lg">
            Updated past paper player
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-muted sm:text-[15px]">
            We&apos;ve updated our UI to closely resemble the official UAT-UK
            interface. If something looks off, a shortcut is wrong, or a question
            is broken, report a bug and we&apos;ll look into it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="rounded-organic-md bg-primary px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Report a bug
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-organic-md px-3 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <BugReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}
