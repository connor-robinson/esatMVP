"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/seo/config";
import { formatPartnerAccessDate } from "@/lib/partners/dates";
import { partnerShortAccessLabel } from "@/lib/partners/eligibility";
import {
  redeemErrorMessage,
  redeemErrorTitle,
  type RedeemErrorCode,
} from "@/lib/partners/types";
import {
  AccessOutcomeCard,
  ACCESS_CTA,
  ACCESS_CTA_SECONDARY,
  AccessTextLink,
} from "@/components/partners/AccessOutcomeCard";

type ClaimView =
  | { status: "loading" }
  | { status: "claiming" }
  | {
      status: "ready";
      partnerDisplayName: string;
      partnerSlug: string;
      accessEndsAt: string;
    }
  | {
      status: "already_partner";
      partnerDisplayName: string;
      partnerSlug: string;
      endsAt: string;
    }
  | { status: "already_paid" }
  | { status: "error"; code: RedeemErrorCode; message: string };

async function redeemCode(raw: string) {
  const res = await fetch("/api/access/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: raw }),
  });
  const data = await res.json();
  return { res, data };
}

function asErrorCode(value: unknown): RedeemErrorCode {
  const code = String(value || "invalid_token") as RedeemErrorCode;
  return code;
}

/**
 * Direct-link claim UX for `/access/[code]`.
 * Flow: Claim access → (signup if needed) → onboarding → redeem.
 */
export function AccessClaimPanel({ code }: { code: string }) {
  const [view, setView] = useState<ClaimView>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const peekRes = await fetch("/api/access/peek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code }),
        });
        const peek = await peekRes.json();
        if (cancelled) return;
        if (!peekRes.ok || !peek.ok) {
          const codeErr = asErrorCode(peek.error);
          setView({
            status: "error",
            code: codeErr,
            message: redeemErrorMessage(codeErr),
          });
          return;
        }

        const statusRes = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        const status = await statusRes.json();
        if (cancelled) return;

        if (status.authenticated === true && status.hasFullAccess === true) {
          if (status.source === "partner") {
            setView({
              status: "already_partner",
              partnerDisplayName: String(
                status.partnerDisplayName || peek.partnerDisplayName,
              ),
              partnerSlug: String(
                status.partnerSlug || peek.partnerSlug || "",
              ),
              endsAt: String(
                status.partnerEndsAt || status.accessUntil || peek.accessEndsAt,
              ),
            });
            return;
          }
          setView({ status: "already_paid" });
          return;
        }

        setView({
          status: "ready",
          partnerDisplayName: String(peek.partnerDisplayName),
          partnerSlug: String(peek.partnerSlug || ""),
          accessEndsAt: String(peek.accessEndsAt),
        });
      } catch {
        if (!cancelled) {
          setView({
            status: "error",
            code: "unavailable",
            message: "Something went wrong. Please try again.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onClaim() {
    setSubmitting(true);
    setView((prev) =>
      prev.status === "ready" ? { status: "claiming" } : prev,
    );
    try {
      const { res, data } = await redeemCode(code);
      // Login, onboarding, or success - always follow server redirect first.
      if (data.redirectTo) {
        window.location.href = data.redirectTo;
        return;
      }
      if (data.error === "already_partner_entitled") {
        setView({
          status: "already_partner",
          partnerDisplayName: String(data.partnerDisplayName || ""),
          partnerSlug: String(data.partnerSlug || ""),
          endsAt: String(data.endsAt || ""),
        });
        setSubmitting(false);
        return;
      }
      if (data.error === "already_paid") {
        setView({ status: "already_paid" });
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data.ok) {
        const codeErr = asErrorCode(data.error);
        setView({
          status: "error",
          code: codeErr,
          message: redeemErrorMessage(codeErr),
        });
        setSubmitting(false);
        return;
      }
      window.location.href = "/access/success";
    } catch {
      setView({
        status: "error",
        code: "unavailable",
        message: "Something went wrong. Please try again.",
      });
      setSubmitting(false);
    }
  }

  const shortLabel =
    view.status === "ready" || view.status === "already_partner"
      ? partnerShortAccessLabel({
          displayName: view.partnerDisplayName,
          slug: view.partnerSlug,
        })
      : "";

  if (view.status === "loading" || view.status === "claiming") {
    return (
      <AccessOutcomeCard
        title={
          view.status === "claiming"
            ? "Continuing"
            : "Checking your access"
        }
        loading
        loadingLabel={
          view.status === "claiming"
            ? "Continuing…"
            : "Checking your access…"
        }
        testId="access-claim-panel"
      >
        <p />
      </AccessOutcomeCard>
    );
  }

  if (view.status === "error") {
    return (
      <AccessOutcomeCard
        title={redeemErrorTitle(view.code)}
        tone="error"
        testId="access-claim-panel"
        actions={
          <Link href="/access" className={ACCESS_CTA}>
            Enter a different code
          </Link>
        }
      >
        <p className="text-text-muted" role="alert">
          {view.message}
        </p>
      </AccessOutcomeCard>
    );
  }

  if (view.status === "ready") {
    return (
      <AccessOutcomeCard
        title={`Your ${shortLabel} access is ready`}
        tone="info"
        testId="access-claim-panel"
        actions={
          <button
            type="button"
            disabled={submitting}
            onClick={onClaim}
            className={ACCESS_CTA}
            data-testid="claim-access-button"
          >
            {submitting ? "Continuing…" : "Claim access"}
          </button>
        }
      >
        <p className="text-text-muted">
          Redeem full access to ESAT Camp until{" "}
          {formatPartnerAccessDate(view.accessEndsAt)}, from the{" "}
          {view.partnerDisplayName}.
        </p>
      </AccessOutcomeCard>
    );
  }

  if (view.status === "already_partner") {
    return (
      <AccessOutcomeCard
        title={`You already have ${shortLabel} access`}
        tone="success"
        testId="access-claim-panel"
        actions={
          <>
            <Link href={APP_ROUTES.calibration} className={ACCESS_CTA}>
              Try calibration test
            </Link>
            <Link
              href={APP_ROUTES.questionBank}
              className={ACCESS_CTA_SECONDARY}
            >
              Explore the question bank
            </Link>
            <AccessTextLink href={APP_ROUTES.dashboard}>
              Go to dashboard
            </AccessTextLink>
          </>
        }
      >
        <p className="text-text-muted">
          Your ESAT Camp access through {view.partnerDisplayName} is already
          active until {formatPartnerAccessDate(view.endsAt)}.
        </p>
      </AccessOutcomeCard>
    );
  }

  return (
    <AccessOutcomeCard
      title="You already have full access"
      tone="success"
      testId="access-claim-panel"
      actions={
        <>
          <Link href={APP_ROUTES.calibration} className={ACCESS_CTA}>
            Try calibration test
          </Link>
          <Link href={APP_ROUTES.questionBank} className={ACCESS_CTA_SECONDARY}>
            Explore the question bank
          </Link>
          <AccessTextLink href={APP_ROUTES.dashboard}>
            Go to dashboard
          </AccessTextLink>
        </>
      }
    >
      <p className="text-text-muted">
        Your account already has full ESAT Camp access, so you don&apos;t need
        to redeem this complimentary code.
      </p>
    </AccessOutcomeCard>
  );
}
