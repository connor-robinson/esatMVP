"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionFeedbackResponse } from "@/types/questionBank";

const QUICK_REASONS = [
  "Wrong answer or solution",
  "Unclear wording",
  "LaTeX or formatting issue",
  "Too easy or too hard",
  "Duplicate or broken question",
  "Other",
] as const;

interface QuestionReportPopoverProps {
  questionId: string;
  isAuthenticated: boolean;
  feedback: QuestionFeedbackResponse | null;
  feedbackLoading: boolean;
  onFeedbackChange: (next: QuestionFeedbackResponse) => void;
}

export function QuestionReportPopover({
  questionId,
  isAuthenticated,
  feedback,
  feedbackLoading,
  onFeedbackChange,
}: QuestionReportPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const reported = Boolean(feedback?.userDisliked);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (reported && feedback?.userReportReason) {
      const match = QUICK_REASONS.find((r) => r === feedback.userReportReason);
      if (match) {
        setSelectedReason(match);
        setCustomReason("");
      } else if (feedback.userReportReason.startsWith("Other: ")) {
        setSelectedReason("Other");
        setCustomReason(feedback.userReportReason.slice(7));
      } else {
        setSelectedReason("Other");
        setCustomReason(feedback.userReportReason);
      }
    } else {
      setSelectedReason(null);
      setCustomReason("");
    }
  }, [open, reported, feedback?.userReportReason]);

  const resolvedReason = (): string | null => {
    if (!selectedReason) return null;
    if (selectedReason === "Other") {
      const detail = customReason.trim();
      return detail ? `Other: ${detail}` : "Other";
    }
    return selectedReason;
  };

  const submitReport = async () => {
    const reason = resolvedReason();
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/question-bank/questions/${questionId}/dislike`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit report");
      }
      const data: QuestionFeedbackResponse = await res.json();
      onFeedbackChange(data);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const removeReport = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/question-bank/questions/${questionId}/dislike`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: true }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not remove report");
      }
      const data: QuestionFeedbackResponse = await res.json();
      onFeedbackChange(data);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove report");
    } finally {
      setSubmitting(false);
    }
  };

  if (feedbackLoading) {
    return <span className="text-xs text-text-muted">…</span>;
  }

  if (!isAuthenticated) {
    return <span className="text-xs text-text-muted">Sign in to report</span>;
  }

  const canSubmit = Boolean(resolvedReason()) && !submitting;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex min-h-[2rem] items-center gap-1.5 rounded-organic-md px-2.5 py-1.5 text-xs font-medium",
          "transition-all duration-fast ease-signature",
          "active:scale-[0.97] hover:brightness-110",
          "outline-none focus-visible:ring-2 focus-visible:ring-secondary/35",
          reported
            ? "bg-error/15 text-error"
            : "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text dark:hover:bg-surface-neutral",
        )}
      >
        <Flag
          className={cn("h-3.5 w-3.5 shrink-0", reported && "fill-current")}
        />
        <span>{reported ? "Reported" : "Report"}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Report question"
          className={cn(
            "absolute bottom-full right-0 z-50 mb-2 w-[min(19rem,calc(100vw-1.5rem))]",
            "rounded-organic-lg bg-surface-elevated p-3 shadow-modal-card",
            "origin-bottom-right transition-all duration-150 ease-signature",
          )}
        >
          <div className="mb-2.5 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-text">
              {reported ? "Update your report" : "Why are you reporting?"}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-organic-md text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((reason) => {
              const active = selectedReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={cn(
                    "rounded-organic-md px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug transition-all duration-fast",
                    "outline-none active:scale-[0.98]",
                    active
                      ? "bg-error/15 text-error"
                      : "bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text",
                  )}
                >
                  {reason}
                </button>
              );
            })}
          </div>

          {selectedReason === "Other" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Brief details (optional)"
              rows={2}
              className={cn(
                "mt-2.5 w-full resize-none rounded-organic-md bg-surface-mid px-2.5 py-2",
                "text-xs text-text placeholder:text-text-disabled",
                "outline-none focus:bg-surface-neutral",
              )}
            />
          )}

          {error && (
            <p className="mt-2 text-[11px] text-error" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={submitReport}
              disabled={!canSubmit}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-organic-md px-3 py-2 text-xs font-semibold",
                "transition-all duration-fast outline-none active:scale-[0.98]",
                canSubmit
                  ? "bg-error/20 text-error hover:bg-error/28"
                  : "cursor-not-allowed bg-surface-mid text-text-disabled opacity-60",
              )}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {reported ? "Update report" : "Submit report"}
            </button>
            {reported && (
              <button
                type="button"
                onClick={removeReport}
                disabled={submitting}
                className="shrink-0 rounded-organic-md px-2.5 py-2 text-[11px] font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
