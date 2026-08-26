"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  redeemErrorMessage,
  redeemErrorTitle,
  type RedeemErrorCode,
} from "@/lib/partners/types";
import {
  isLegacyInviteToken,
  isShortAccessCode,
  stripAccessCode,
} from "@/lib/partners/accessCodeFormat";
import {
  AccessOutcomeCard,
  ACCESS_CTA,
  AccessTextLink,
} from "@/components/partners/AccessOutcomeCard";

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

  const urlErrorCode = useMemo(() => {
    const code = searchParams.get("error");
    if (!code || !ERROR_CODES.has(code)) return null;
    return code as RedeemErrorCode;
  }, [searchParams]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmed = token.trim();
    if (!trimmed) {
      setFormError(
        "Enter the access code provided by your school or programme.",
      );
      return;
    }
    router.push(accessPathForInput(trimmed));
  }

  return (
    <AccessOutcomeCard
      eyebrow="Institution access"
      title="Access ESAT Camp"
      tone="info"
      testId="access-manual-entry"
      actions={undefined}
    >
      <p className="text-text-muted">
        Enter the access code provided by your school or programme.
      </p>

      {(urlErrorCode || formError) && (
        <div
          className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {urlErrorCode ? (
            <>
              <p className="font-semibold text-red-100">
                {redeemErrorTitle(urlErrorCode)}
              </p>
              <p className="mt-1">{redeemErrorMessage(urlErrorCode)}</p>
            </>
          ) : (
            <p>{formError}</p>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-text">Access code</span>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1.5 w-full rounded-xl border-0 bg-surface-mid px-3.5 py-2.5 text-sm text-text outline-none ring-0 placeholder:text-text-muted focus:outline-none focus:ring-0"
            placeholder="Access code"
            data-testid="access-code-input"
          />
        </label>
        <button type="submit" className={ACCESS_CTA}>
          Continue
        </button>
      </form>

      <p className="mt-6 text-xs text-text-muted">
        Need help?{" "}
        <Link href="/help" className="underline underline-offset-2">
          Contact support
        </Link>
        .
      </p>

      <div className="mt-2">
        <AccessTextLink href="/">Back to homepage</AccessTextLink>
      </div>
    </AccessOutcomeCard>
  );
}
