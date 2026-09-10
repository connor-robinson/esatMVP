"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { trackEvent } from "@/lib/ga/trackEvent";
import { collectSupportDiagnostics } from "@/lib/support/diagnostics";
import { cn } from "@/lib/utils";

const QUICK_REASONS = [
  "Wrong answer or solution",
  "Question is unclear",
  "Diagram looks wrong",
  "Formatting looks broken",
  "Something else",
] as const;

export type QuestionSupportControlProps = {
  questionId: string;
  paperId?: string | null;
  sessionId?: string | null;
  /** Extra class on the outer wrapper (positioning). */
  className?: string;
  /** Visual tone for immersive Pearson / ESAT shells. */
  tone?: "app" | "exam";
};

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Compact expandable “report this question” control for session screens.
 * Sits above the bottom bar; quick reasons + optional note + Send.
 */
export function QuestionSupportControl({
  questionId,
  paperId,
  sessionId,
  className,
  tone = "app",
}: QuestionSupportControlProps) {
  const session = useSupabaseSession();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset draft when the question changes.
    setOpen(false);
    setReason(null);
    setDetails("");
    setError(null);
    setSent(false);
    setSubmitting(false);
    idempotencyRef.current = null;
  }, [questionId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (!submitting) setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, submitting]);

  if (!session?.user) return null;

  const canSend =
    !submitting &&
    ((reason != null && reason.length > 0) || details.trim().length >= 3);

  const exam = tone === "exam";

  const handleSend = async () => {
    if (!canSend) return;
    setSubmitting(true);
    setError(null);

    const subject = reason ?? "Question issue";
    const messageParts = [
      reason ? `Issue: ${reason}` : null,
      details.trim() ? details.trim() : "No extra details.",
    ].filter(Boolean);
    const message = messageParts.join("\n\n");

    if (!idempotencyRef.current) {
      idempotencyRef.current = createIdempotencyKey();
    }

    const diagnostics = collectSupportDiagnostics();
    const context: Record<string, string> = { questionId: String(questionId) };
    if (paperId) context.paperId = String(paperId);
    if (sessionId) context.sessionId = String(sessionId);

    try {
      const res = await fetch("/api/support/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "question_or_content_error",
          subject: subject.slice(0, 120),
          message: message.slice(0, 4000),
          replyEmail: session.user.email ?? "",
          pageUrl: diagnostics.pageUrl,
          userAgent: diagnostics.userAgent,
          viewport: diagnostics.viewport,
          platform: diagnostics.platform,
          appVersion: diagnostics.appVersion,
          context,
          idempotencyKey: idempotencyRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not send",
        );
      }
      setSent(true);
      setReason(null);
      setDetails("");
      idempotencyRef.current = null;
      trackEvent("support_submission_completed", {
        category: "question_or_content_error",
        placement: "question_session",
      });
      window.setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      trackEvent("support_submission_failed", {
        reason: "question_session",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) {
            trackEvent("support_opened", { placement: "question_session" });
          }
          setOpen((v) => !v);
          setSent(false);
          setError(null);
        }}
        className={cn(
          "inline-flex min-h-[36px] items-center gap-1.5 rounded-organic-md px-3 py-1.5 text-xs font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:shadow-glow-focus",
          exam
            ? "bg-[#1e293b] text-[#e2e8f0] hover:bg-[#334155]"
            : "bg-surface-elevated text-text-muted shadow-bar-floating hover:bg-surface-mid hover:text-text",
        )}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
        Report question
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Report a problem with this question"
          className={cn(
            "absolute bottom-full right-0 z-50 mb-2 w-[min(20.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-organic-xl p-3 shadow-modal-card",
            exam
              ? "border border-[#334155] bg-[#0f172a] text-[#e2e8f0]"
              : "bg-surface-elevated text-text",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">What&apos;s wrong?</p>
            <button
              type="button"
              aria-label="Close"
              disabled={submitting}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-organic-md p-1",
                exam
                  ? "text-[#94a3b8] hover:bg-[#1e293b] hover:text-white"
                  : "text-text-muted hover:bg-surface-mid hover:text-text",
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          {sent ? (
            <p className="mt-3 text-sm text-success" role="status">
              Thanks. We&apos;ve got it.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-1.5">
                {QUICK_REASONS.map((label) => {
                  const selected = reason === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={submitting}
                      onClick={() => setReason(label)}
                      className={cn(
                        "rounded-organic-md px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? exam
                            ? "bg-[#3b82f6] text-white"
                            : "bg-primary text-background"
                          : exam
                            ? "bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]"
                            : "bg-surface-mid text-text hover:bg-surface-neutral",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <label className="mt-3 block">
                <span
                  className={cn(
                    "text-xs",
                    exam ? "text-[#94a3b8]" : "text-text-muted",
                  )}
                >
                  Add details (optional)
                </span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={submitting}
                  placeholder="Anything that helps us find the issue..."
                  className={cn(
                    "mt-1.5 w-full resize-none rounded-organic-md px-3 py-2 text-sm outline-none",
                    exam
                      ? "border border-[#334155] bg-[#111827] text-[#e2e8f0] placeholder:text-[#64748b]"
                      : "border border-border-subtle bg-surface-mid text-text placeholder:text-text-disabled focus:border-border",
                  )}
                />
              </label>

              {error ? (
                <p className="mt-2 text-xs text-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                  className={cn(
                    "inline-flex min-h-[36px] min-w-[5.5rem] items-center justify-center rounded-organic-md px-3 py-1.5 text-sm font-semibold transition-opacity",
                    canSend
                      ? exam
                        ? "bg-[#3b82f6] text-white hover:opacity-90"
                        : "bg-primary text-background hover:opacity-90"
                      : exam
                        ? "cursor-not-allowed bg-[#1e293b] text-[#64748b]"
                        : "cursor-not-allowed bg-surface-mid text-text-disabled",
                  )}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
