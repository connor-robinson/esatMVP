"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { formatPartnerAccessDate } from "@/lib/partners/dates";
import { redeemErrorMessage, type RedeemErrorCode } from "@/lib/partners/types";
import {
  isLegacyInviteToken,
  isShortAccessCode,
  stripAccessCode,
} from "@/lib/partners/accessCodeFormat";

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

type PeekState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      partnerDisplayName: string;
      accessEndsAt: string;
      kind: "invite" | "cohort";
    }
  | { status: "error"; message: string };

function accessPathForInput(raw: string): string {
  const trimmed = raw.trim();
  if (isLegacyInviteToken(trimmed) && !isShortAccessCode(trimmed)) {
    return `/access/redeem/${encodeURIComponent(trimmed)}`;
  }
  return `/access/${encodeURIComponent(stripAccessCode(trimmed))}`;
}

export function AccessCodeEntry({
  initialCode = "",
  autoPeek = false,
}: {
  initialCode?: string;
  autoPeek?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(initialCode);
  const [peek, setPeek] = useState<PeekState>(
    autoPeek && initialCode ? { status: "loading" } : { status: "idle" },
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const urlError = useMemo(() => {
    const code = searchParams.get("error");
    if (!code || !ERROR_CODES.has(code)) return null;
    return redeemErrorMessage(code as RedeemErrorCode);
  }, [searchParams]);

  useEffect(() => {
    if (!autoPeek || !initialCode.trim()) return;
    let cancelled = false;
    (async () => {
      setPeek({ status: "loading" });
      try {
        const res = await fetch("/api/access/peek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: initialCode }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setPeek({
            status: "error",
            message: redeemErrorMessage(
              (data.error as RedeemErrorCode) || "invalid_token",
            ),
          });
          return;
        }
        setPeek({
          status: "ready",
          partnerDisplayName: String(data.partnerDisplayName),
          accessEndsAt: String(data.accessEndsAt),
          kind: data.kind === "cohort" ? "cohort" : "invite",
        });
        setToken(initialCode);
      } catch {
        if (!cancelled) {
          setPeek({
            status: "error",
            message: "Something went wrong. Please try again.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoPeek, initialCode]);

  async function redeem(raw: string) {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw }),
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

  async function onSubmitCode(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setFormError("Enter the access code provided by your school or programme.");
      return;
    }

    // Short / cohort: navigate to the short URL so the URL bar matches.
    // Legacy long tokens keep the redeem path.
    if (autoPeek) {
      await redeem(trimmed);
      return;
    }

    router.push(accessPathForInput(trimmed));
  }

  async function onContinueRedeem() {
    const raw = token.trim() || initialCode.trim();
    if (!raw) return;
    await redeem(raw);
  }

  const showEntryForm = !autoPeek || peek.status === "error" || peek.status === "idle";

  return (
    <main className="min-h-[70vh] py-16">
      <Container size="sm">
        <h1 className="text-3xl font-semibold tracking-tight !text-white">
          Access ESAT Camp
        </h1>
        <p className="mt-3 text-text-muted">
          Enter the access code provided by your school or programme.
        </p>

        {(urlError || formError) && (
          <p
            className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {formError || urlError}
          </p>
        )}

        {peek.status === "loading" && (
          <p className="mt-8 text-sm text-text-muted">Checking your code…</p>
        )}

        {peek.status === "error" && (
          <p className="mt-6 rounded-lg bg-red-500/15 px-4 py-3 text-sm text-red-200" role="alert">
            {peek.message}
          </p>
        )}

        {peek.status === "ready" && (
          <div className="mt-8 space-y-4">
            <p className="text-lg font-medium text-text">
              {peek.partnerDisplayName}
            </p>
            <p className="text-sm text-text-muted">
              Full access available until{" "}
              {formatPartnerAccessDate(peek.accessEndsAt)}.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={onContinueRedeem}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Continuing…" : "Continue"}
            </button>
          </div>
        )}

        {showEntryForm && (
          <form onSubmit={onSubmitCode} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-text">Access code</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-2 w-full rounded-lg bg-surface-mid px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Access code"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Continuing…" : "Continue"}
            </button>
          </form>
        )}

        <p className="mt-10 text-sm text-text-muted">
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
