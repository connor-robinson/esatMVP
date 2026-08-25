"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { redeemErrorMessage, type RedeemErrorCode } from "@/lib/partners/types";

const ERROR_CODES = new Set([
  "invalid_token",
  "already_claimed",
  "expired",
  "unavailable",
  "partner_inactive",
  "already_entitled",
  "rate_limited",
  "unauthenticated",
]);

export default function AccessPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const urlError = useMemo(() => {
    const code = searchParams.get("error");
    if (!code || !ERROR_CODES.has(code)) return null;
    return redeemErrorMessage(code as RedeemErrorCode);
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setFormError("Paste your invitation code to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      const data = await res.json();
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      if (!res.ok || !data.ok) {
        setFormError(
          redeemErrorMessage((data.error as RedeemErrorCode) || "invalid_token"),
        );
        setSubmitting(false);
        return;
      }
      window.location.href = "/access/success";
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[70vh] py-16">
      <Container size="sm">
        <h1 className="text-3xl font-semibold tracking-tight !text-white">
          Institution access
        </h1>
        <p className="mt-3 text-text-muted">
          Have an institution access code? Paste the unique invitation you were
          sent. Each code works once.
        </p>

        {(urlError || formError) && (
          <p
            className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {formError || urlError}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-text">
              Invitation code
            </span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 w-full rounded-lg bg-surface-mid px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Paste your code here"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Redeeming…" : "Redeem access"}
          </button>
        </form>

        <p className="mt-10 text-sm text-text-muted">
          Prefer a link? Use the unique claim URL your organisation sent you.
          Need help?{" "}
          <Link href="/help" className="underline underline-offset-2">
            Contact support
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
