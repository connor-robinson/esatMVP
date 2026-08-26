"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
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
  "already_partner_entitled",
  "already_paid",
  "rate_limited",
  "unauthenticated",
]);

function accessPathForInput(raw: string): string {
  const trimmed = raw.trim();
  if (isLegacyInviteToken(trimmed) && !isShortAccessCode(trimmed)) {
    return `/access/redeem/${encodeURIComponent(trimmed)}`;
  }
  return `/access/${encodeURIComponent(stripAccessCode(trimmed))}`;
}

/** Manual code entry only. Used exclusively on `/access`. */
export function AccessManualEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const urlError = useMemo(() => {
    const code = searchParams.get("error");
    if (!code || !ERROR_CODES.has(code)) return null;
    return redeemErrorMessage(code as RedeemErrorCode);
  }, [searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setFormError("Enter the access code provided by your school or programme.");
      return;
    }
    router.push(accessPathForInput(trimmed));
  }

  return (
    <main className="min-h-[70vh] py-16" data-testid="access-manual-entry">
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

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              data-testid="access-code-input"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
          >
            Continue
          </button>
        </form>

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
