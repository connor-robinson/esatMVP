"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2, Loader2, MessageCircleQuestion, X } from "lucide-react";
import {
  SUPPORT_LIMITS,
  SUPPORT_PUBLIC_EMAIL,
  SUPPORT_RESPONSE_COPY,
} from "@/lib/support/constants";
import { collectSupportDiagnostics } from "@/lib/support/diagnostics";
import { buildSupportMailto } from "@/lib/support/mailto";
import { cn } from "@/lib/utils";

const ACCESS_DRAFT_KEY = "esatcamp.accessHelpDraft.v1";

type UiPhase = "form" | "submitting" | "success" | "error";

type AccessDraft = {
  email: string;
  query: string;
};

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function subjectFromQuery(query: string): string {
  const firstLine = query.trim().split(/\r?\n/)[0] ?? "";
  const clipped = firstLine.slice(0, SUPPORT_LIMITS.subjectMax).trim();
  if (clipped.length >= SUPPORT_LIMITS.subjectMin) return clipped;
  return "Access page help";
}

function readDraft(): Partial<AccessDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ACCESS_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AccessDraft>;
  } catch {
    return null;
  }
}

function writeDraft(draft: AccessDraft) {
  try {
    sessionStorage.setItem(ACCESS_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(ACCESS_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Guest Help for /access: blue FAB expands into a small popup (not fullscreen).
 * Outside click / Escape closes; draft is kept in sessionStorage.
 */
export function AccessHelpControl() {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const idempotencyRef = useRef<string | null>(null);

  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [phase, setPhase] = useState<UiPhase>("form");
  const [error, setError] = useState<string | null>(null);
  const [mailtoHref, setMailtoHref] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    const draft = readDraft();
    if (draft?.email) setEmail(draft.email);
    if (draft?.query) setQuery(draft.query);
  }, []);

  useEffect(() => {
    if (!hydrated || phase === "success") return;
    writeDraft({ email, query });
  }, [email, query, hydrated, phase]);

  useEffect(() => {
    if (!open) return;
    if (!idempotencyRef.current) {
      idempotencyRef.current = createIdempotencyKey();
    }
    setPhase((prev) => (prev === "success" ? "form" : prev));
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const closeQuietly = useCallback(() => {
    if (phase === "submitting") return;
    setOpen(false);
  }, [phase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuietly();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeQuietly]);

  const canSubmit =
    phase !== "submitting" &&
    email.trim().includes("@") &&
    query.trim().length >= SUPPORT_LIMITS.messageMin;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase("submitting");
    setError(null);
    setMailtoHref(null);

    const diagnostics = collectSupportDiagnostics();
    const subject = subjectFromQuery(query);
    const message = query.trim();
    const replyEmail = email.trim();

    const payload = {
      category: "account_or_access" as const,
      subject,
      message,
      replyEmail,
      pageUrl: diagnostics.pageUrl,
      userAgent: diagnostics.userAgent,
      viewport: diagnostics.viewport,
      platform: diagnostics.platform,
      appVersion: diagnostics.appVersion,
      context: {},
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
                category: "account_or_access",
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
        return;
      }

      setReference(
        typeof data.reference === "string"
          ? data.reference
          : String(data.id ?? "")
              .replace(/-/g, "")
              .slice(0, 8)
              .toUpperCase(),
      );
      clearDraft();
      setQuery("");
      setHoneypot("");
      idempotencyRef.current = null;
      setPhase("success");
    } catch {
      setMailtoHref(
        buildSupportMailto({
          category: "account_or_access",
          subject,
          message,
          replyEmail,
          pageUrl: diagnostics.pageUrl,
        }),
      );
      setError("Could not reach the server. Please try again or email us.");
      setPhase("error");
    }
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed z-[101] flex justify-end",
          "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))]",
          "sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <button
          type="button"
          className={cn(
            "pointer-events-auto inline-flex items-center gap-2 rounded-xl",
            "bg-[#3B82F6] px-3.5 py-2.5 text-sm font-semibold text-white",
            "shadow-lg transition-colors hover:bg-[#2563EB]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60",
            "min-h-[44px] min-w-[44px]",
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="access-help-panel"
          onClick={() => {
            if (open) {
              closeQuietly();
              return;
            }
            setOpen(true);
          }}
        >
          {open ? (
            <X className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <MessageCircleQuestion className="h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{open ? "Close" : "Help"}</span>
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[99] cursor-default bg-transparent"
            aria-label="Dismiss help"
            disabled={phase === "submitting"}
            onClick={closeQuietly}
          />
          <div
            id="access-help-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className={cn(
              "fixed z-[100] flex w-[min(calc(100vw-1.5rem),22rem)] flex-col",
              "max-h-[min(70dvh,28rem)] overflow-hidden",
              "rounded-xl border border-border-subtle bg-surface-elevated shadow-lg",
              "right-[max(0.75rem,env(safe-area-inset-right,0px))]",
              "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]",
            )}
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-base font-bold tracking-tight text-text"
                >
                  Need help?
                </h2>
                <p id={descId} className="mt-0.5 text-xs text-text-muted">
                  No account needed. Leave your email and question.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeQuietly}
                disabled={phase === "submitting"}
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3">
              {phase === "success" ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <CheckCircle2
                    className="h-8 w-8 text-[#4ADE80]"
                    aria-hidden
                  />
                  <div>
                    <p className="text-sm font-semibold text-text">
                      Request received
                    </p>
                    {reference ? (
                      <p className="mt-1 font-mono text-xs text-text-muted">
                        Reference {reference}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-text-muted">
                      {SUPPORT_RESPONSE_COPY}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 rounded-xl bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"
                    onClick={() => {
                      setPhase("form");
                      setReference(null);
                      setOpen(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium text-text">Email</span>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-xl border-0 bg-surface-mid px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
                      placeholder="you@school.com"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-text">
                      Your question
                    </span>
                    <textarea
                      required
                      rows={4}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="mt-1 w-full resize-y rounded-xl border-0 bg-surface-mid px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
                      placeholder="How can we help with your access code?"
                    />
                  </label>

                  <div
                    className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
                    aria-hidden
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

                  {phase === "error" && error ? (
                    <div
                      className="rounded-xl bg-red-500/15 px-3 py-2.5 text-sm text-red-200"
                      role="alert"
                    >
                      <p>{error}</p>
                      {mailtoHref ? (
                        <a
                          href={mailtoHref}
                          className="mt-2 inline-block underline underline-offset-2"
                        >
                          Email {SUPPORT_PUBLIC_EMAIL}
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-2 rounded-xl",
                      "bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white",
                      "transition-colors hover:bg-[#2563EB]",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    {phase === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Sending…
                      </>
                    ) : (
                      "Send"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
