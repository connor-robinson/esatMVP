"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/layout/Container";
import {
  useSupabaseSession,
} from "@/components/auth/SupabaseSessionProvider";
import { cn } from "@/lib/utils";

export default function HelpContactPage() {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session?.user?.email, email]);

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(pathname || "/help")}`,
    [pathname],
  );

  const canSubmit =
    !!session?.user &&
    email.trim().includes("@") &&
    subject.trim().length >= 2 &&
    body.trim().length >= 3 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/support/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim(),
          description: body.trim(),
          pageUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not send message",
        );
      }
      setSent(true);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="sm" className="py-14 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">
          Support
        </p>
        <h1 className="mt-3 text-3xl font-display font-bold tracking-tight text-text">
          Help &amp; contact
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Bugs, complaints, help, or other issues — send us a message and we
          will get back to you.
        </p>

        {!session?.user ? (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-text-muted">
              Sign in to send a message.
            </p>
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#2563EB]"
            >
              Sign in
            </Link>
          </div>
        ) : sent ? (
          <div className="mt-10 space-y-3">
            <p className="text-base font-semibold text-text">Message sent.</p>
            <p className="text-sm text-text-muted">
              Thanks — we will get back to you.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm font-semibold text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
            >
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  "w-full rounded-xl bg-surface-elevated px-4 py-3 text-sm text-text placeholder:text-text-subtle",
                  "outline-none transition-colors hover:bg-surface-mid focus:bg-surface-mid",
                )}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                Subject
              </span>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary"
                maxLength={120}
                className={cn(
                  "w-full rounded-xl bg-surface-elevated px-4 py-3 text-sm text-text placeholder:text-text-subtle",
                  "outline-none transition-colors hover:bg-surface-mid focus:bg-surface-mid",
                )}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                Message
              </span>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What happened?"
                rows={6}
                maxLength={2000}
                className={cn(
                  "w-full resize-none rounded-xl bg-surface-elevated px-4 py-3 text-sm text-text placeholder:text-text-subtle",
                  "outline-none transition-colors hover:bg-surface-mid focus:bg-surface-mid",
                )}
              />
            </label>

            {error ? (
              <p className="text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "inline-flex w-full items-center justify-center rounded-xl px-5 py-3.5 text-sm font-bold transition-colors",
                canSubmit
                  ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
                  : "cursor-not-allowed bg-white/10 text-white/40",
              )}
            >
              {submitting ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </Container>
  );
}
