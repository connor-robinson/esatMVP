"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

      <form onSubmit={onSubmit} className="mt-24 sm:mt-28">
        <div className="flex items-center gap-5">
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            aria-label="Access code"
            className="min-w-0 flex-1 rounded-xl border-0 bg-surface-mid px-4 py-3 text-base text-text outline-none ring-0 placeholder:text-text-muted focus:outline-none focus:ring-0"
            placeholder="Access code"
            data-testid="access-code-input"
          />
          <button type="submit" className={`${ACCESS_CTA} shrink-0 px-10`}>
            Continue
          </button>
        </div>
      </form>

      <div className="mt-10 sm:mt-12">
        <AccessTextLink href="/">Back to homepage</AccessTextLink>
      </div>
    </AccessOutcomeCard>
  );
}
