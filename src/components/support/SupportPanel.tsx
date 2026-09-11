"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_INTRO_COPY,
  SUPPORT_LIMITS,
  SUPPORT_PUBLIC_EMAIL,
  SUPPORT_RESPONSE_COPY,
  type SupportCategory,
} from "@/lib/support/constants";
import { collectSupportDiagnostics } from "@/lib/support/diagnostics";
import { buildSupportMailto } from "@/lib/support/mailto";
import { cn } from "@/lib/utils";
import { useOptionalSupport } from "./SupportProvider";

const DRAFT_STORAGE_KEY = "esatcamp.supportDraft.v1";

type DraftState = {
  category: SupportCategory;
  subject: string;
  message: string;
  replyEmail: string;
};

type UiPhase = "form" | "submitting" | "success" | "error";

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readDraft(): Partial<DraftState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<DraftState>;
  } catch {
    return null;
  }
}

function writeDraft(draft: DraftState) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Compact Help popup anchored bottom-right (expands from the launcher).
 * Outside click / Escape closes without clearing the draft.
 */
export function SupportPanel() {
  const support = useOptionalSupport();
  const session = useSupabaseSession();
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const idempotencyRef = useRef<string | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [category, setCategory] = useState<SupportCategory>("technical_problem");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [phase, setPhase] = useState<UiPhase>("form");
  const [error, setError] = useState<string | null>(null);
  const [mailtoHref, setMailtoHref] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    const draft = readDraft();
    if (draft?.category && SUPPORT_CATEGORIES.includes(draft.category)) {
      setCategory(draft.category);
    }
    if (draft?.subject) setSubject(draft.subject);
    if (draft?.message) setMessage(draft.message);
    if (draft?.replyEmail) setReplyEmail(draft.replyEmail);
  }, []);

  useEffect(() => {
    if (!support?.open) return;
    const opts = support.draftOptions;
    if (opts?.category) setCategory(opts.category);
    if (opts?.subject) setSubject(opts.subject);
    if (!replyEmail && session?.user?.email) {
      setReplyEmail(session.user.email);
    }
    setPhase((prev) => (prev === "success" ? "form" : prev));
    if (!idempotencyRef.current) {
      idempotencyRef.current = createIdempotencyKey();
    }
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/options drive prefills
  }, [support?.open, support?.draftOptions, session?.user?.email]);

  useEffect(() => {
    if (!hydrated || phase === "success") return;
    writeDraft({ category, subject, message, replyEmail });
  }, [category, subject, message, replyEmail, hydrated, phase]);

  const closeQuietly = useCallback(() => {
    if (!support || phase === "submitting") return;
    support.closeSupport();
  }, [support, phase]);

  useEffect(() => {
    if (!support?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuietly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [support?.open, closeQuietly]);

  const resetAfterSuccess = useCallback(() => {
    setSubject("");
    setMessage("");
    setHoneypot("");
    setError(null);
    setMailtoHref(null);
    setReference(null);
    setPhase("form");
    idempotencyRef.current = createIdempotencyKey();
    clearDraft();
  }, []);

  if (!support || !support.open) return null;

  const canSubmit =
    phase !== "submitting" &&
    subject.trim().length >= SUPPORT_LIMITS.subjectMin &&
    message.trim().length >= SUPPORT_LIMITS.messageMin &&
    replyEmail.trim().includes("@");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase("submitting");
    setError(null);
    setMailtoHref(null);

    const diagnostics = collectSupportDiagnostics();
    const context: Record<string, string> = {};
    if (support.draftOptions?.questionId) {
      context.questionId = support.draftOptions.questionId;
    }
    if (support.draftOptions?.paperId) {
      context.paperId = support.draftOptions.paperId;
    }
    if (support.draftOptions?.sessionId) {
      context.sessionId = support.draftOptions.sessionId;
    }

    const payload = {
      category,
      subject: subject.trim(),
      message: message.trim(),
      replyEmail: replyEmail.trim(),
      pageUrl: diagnostics.pageUrl,
      userAgent: diagnostics.userAgent,
      viewport: diagnostics.viewport,
      platform: diagnostics.platform,
      appVersion: diagnostics.appVersion,
      context,
      idempotencyKey: idempotencyRef.current ?? createIdempotencyKey(),
      companyWebsite: honeypot,
    };

    try {
      const res = await fetch("/api/support/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const fallbackMailto =
          typeof data.mailto === "string"
            ? data.mailto
            : buildSupportMailto({
                category,
                subject,
                message,
                replyEmail,
                pageUrl: diagnostics.pageUrl,
              });
        setMailtoHref(fallbackMailto);
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not save your request",
        );
        setPhase("error");
        trackEvent("support_submission_failed", {
          reason: res.status === 429 ? "rate_limited" : "server_error",
        });
        return;
      }

      setReference(
        typeof data.reference === "string"
          ? data.reference
          : String(data.id ?? "").slice(0, 8).toUpperCase(),
      );
      clearDraft();
      setSubject("");
      setMessage("");
      setHoneypot("");
      idempotencyRef.current = null;
      setPhase("success");
      trackEvent("support_submission_completed", {
        category,
      });
    } catch {
      setMailtoHref(
        buildSupportMailto({
          category,
          subject,
          message,
          replyEmail,
          pageUrl: diagnostics.pageUrl,
        }),
      );
      setError("Could not reach the server. Please try again or email us.");
      setPhase("error");
      trackEvent("support_submission_failed", { reason: "network" });
    }
  };

  const anchorBottom =
    "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]";

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[99] cursor-default bg-transparent"
        aria-label="Dismiss help"
        disabled={phase === "submitting"}
        onClick={closeQuietly}
      />
      <div
        ref={panelRef}
        id="support-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          "fixed z-[100] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col",
          "max-h-[min(70dvh,32rem)] overflow-hidden",
          "rounded-xl border border-border-subtle bg-surface-elevated shadow-lg",
          "right-[max(0.75rem,env(safe-area-inset-right,0px))]",
          anchorBottom,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-heading text-base font-bold text-text"
            >
              Need help?
            </h2>
            <p id={descId} className="mt-0.5 text-xs text-text-muted">
              {SUPPORT_INTRO_COPY}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={closeQuietly}
            disabled={phase === "submitting"}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          <p className="text-xs text-text-muted">
            Email us:{" "}
            <a
              href={`mailto:${SUPPORT_PUBLIC_EMAIL}`}
              className="font-medium text-text underline-offset-2 hover:underline"
            >
              {SUPPORT_PUBLIC_EMAIL}
            </a>
          </p>

          {phase === "success" ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-3 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-text">
                  Request received
                </p>
                {reference ? (
                  <p className="mt-1 font-mono text-xs text-text-subtle">
                    Reference {reference}
                  </p>
                ) : null}
                <p className="mt-1.5 text-xs text-text-muted">
                  {SUPPORT_RESPONSE_COPY}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1 border-0 bg-surface-mid shadow-none hover:bg-surface-neutral"
                onClick={() => {
                  resetAfterSuccess();
                }}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3" noValidate>
              <div
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                aria-hidden="true"
              >
                <label>
                  Company website
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as SupportCategory)
                  }
                  className={cn(
                    "w-full rounded-lg border border-border-subtle bg-surface-mid px-2.5 py-2",
                    "text-sm text-text outline-none focus:border-border",
                  )}
                  required
                >
                  {SUPPORT_CATEGORIES.map((key) => (
                    <option key={key} value={key}>
                      {SUPPORT_CATEGORY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Subject
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={SUPPORT_LIMITS.subjectMax}
                  required
                  placeholder="Short summary"
                  className={cn(
                    "w-full rounded-lg border border-border-subtle bg-surface-mid px-2.5 py-2",
                    "text-sm text-text placeholder:text-text-disabled",
                    "outline-none focus:border-border",
                  )}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Message
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={SUPPORT_LIMITS.messageMax}
                  required
                  placeholder="How can we help?"
                  className={cn(
                    "w-full resize-none rounded-lg border border-border-subtle bg-surface-mid px-2.5 py-2",
                    "text-sm text-text placeholder:text-text-disabled",
                    "outline-none focus:border-border",
                  )}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Reply email
                </span>
                <input
                  type="email"
                  value={replyEmail}
                  onChange={(e) => setReplyEmail(e.target.value)}
                  maxLength={SUPPORT_LIMITS.emailMax}
                  required
                  autoComplete="email"
                  className={cn(
                    "w-full rounded-lg border border-border-subtle bg-surface-mid px-2.5 py-2",
                    "text-sm text-text outline-none focus:border-border",
                  )}
                />
              </label>

              {category === "technical_problem" ? (
                <p className="text-[11px] leading-relaxed text-text-subtle">
                  We include basic browser and device info to help diagnose
                  technical issues. No passwords or session tokens.
                </p>
              ) : null}

              {phase === "error" && error ? (
                <div
                  className="space-y-2 rounded-lg bg-error/10 px-3 py-2.5"
                  role="alert"
                >
                  <p className="text-sm text-error">{error}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPhase("form");
                        setError(null);
                        idempotencyRef.current = createIdempotencyKey();
                      }}
                    >
                      Retry
                    </Button>
                    {mailtoHref ? (
                      <a
                        href={mailtoHref}
                        className={cn(
                          "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium",
                          "bg-primary text-background hover:opacity-90",
                        )}
                      >
                        Open email app
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <Link
                  href="/help"
                  className="text-xs font-medium text-text-muted underline-offset-2 hover:text-text hover:underline"
                  onClick={() => support.closeSupport()}
                >
                  Help Center
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!canSubmit}
                  className="min-w-[6.5rem]"
                >
                  {phase === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
