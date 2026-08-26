"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { APP_ROUTES } from "@/lib/seo/config";
import { formatPartnerAccessDate } from "@/lib/partners/dates";
import { partnerShortAccessLabel } from "@/lib/partners/eligibility";
import { redeemErrorMessage, type RedeemErrorCode } from "@/lib/partners/types";

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
  | { status: "error"; message: string };

async function redeemCode(raw: string) {
  const res = await fetch("/api/access/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: raw }),
  });
  const data = await res.json();
  return { res, data };
}

/** Direct-link claim UX for `/access/[code]`. Never asks the user to enter a code. */
export function AccessClaimPanel({ code }: { code: string }) {
  const [view, setView] = useState<ClaimView>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const autoRedeemStarted = useRef(false);

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
          setView({
            status: "error",
            message: redeemErrorMessage(
              (peek.error as RedeemErrorCode) || "invalid_token",
            ),
          });
          return;
        }

        const statusRes = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        const status = await statusRes.json();
        if (cancelled) return;

        if (status.authenticated === true) {
          if (autoRedeemStarted.current) return;
          autoRedeemStarted.current = true;
          setView({ status: "claiming" });
          const { res, data } = await redeemCode(code);
          if (cancelled) return;
          if (data.redirectTo && (res.ok || data.ok)) {
            window.location.href = data.redirectTo;
            return;
          }
          if (data.error === "already_partner_entitled") {
            setView({
              status: "already_partner",
              partnerDisplayName: String(
                data.partnerDisplayName || peek.partnerDisplayName,
              ),
              partnerSlug: String(data.partnerSlug || peek.partnerSlug || ""),
              endsAt: String(data.endsAt || peek.accessEndsAt),
            });
            return;
          }
          if (data.error === "already_paid") {
            setView({ status: "already_paid" });
            return;
          }
          if (data.error === "already_entitled") {
            setView({
              status: "already_partner",
              partnerDisplayName: String(peek.partnerDisplayName),
              partnerSlug: String(peek.partnerSlug || ""),
              endsAt: String(peek.accessEndsAt),
            });
            return;
          }
          if (!res.ok || !data.ok) {
            setView({
              status: "error",
              message: redeemErrorMessage(
                (data.error as RedeemErrorCode) || "invalid_token",
              ),
            });
            return;
          }
          window.location.href = data.redirectTo || "/access/success";
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
    try {
      const { res, data } = await redeemCode(code);
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
        setView({
          status: "error",
          message: redeemErrorMessage(
            (data.error as RedeemErrorCode) || "invalid_token",
          ),
        });
        setSubmitting(false);
        return;
      }
      window.location.href = "/access/success";
    } catch {
      setView({
        status: "error",
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

  return (
    <main className="min-h-[70vh] py-16" data-testid="access-claim-panel">
      <Container size="sm">
        {view.status === "loading" || view.status === "claiming" ? (
          <p className="text-text-muted">
            {view.status === "claiming"
              ? "Claiming your access…"
              : "Checking your access…"}
          </p>
        ) : null}

        {view.status === "error" && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight !text-white">
              Access unavailable
            </h1>
            <p className="mt-4 text-text-muted" role="alert">
              {view.message}
            </p>
            <Link
              href="/access"
              className="mt-8 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
            >
              Enter a different code
            </Link>
          </>
        )}

        {view.status === "ready" && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight !text-white">
              Your {shortLabel} access is ready
            </h1>
            <p className="mt-4 text-text-muted">
              {view.partnerDisplayName} has provided you with full access to
              ESAT Camp until {formatPartnerAccessDate(view.accessEndsAt)}.
            </p>
            <button
              type="button"
              disabled={submitting}
              onClick={onClaim}
              className="mt-8 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              data-testid="claim-access-button"
            >
              {submitting ? "Claiming…" : "Claim access"}
            </button>
          </>
        )}

        {view.status === "already_partner" && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight !text-white">
              You already have {shortLabel} access
            </h1>
            <p className="mt-4 text-text-muted">
              Your ESAT Camp access through {view.partnerDisplayName} is already
              active until {formatPartnerAccessDate(view.endsAt)}.
            </p>
            <Link
              href={APP_ROUTES.dashboard}
              className="mt-8 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
            >
              Go to dashboard
            </Link>
          </>
        )}

        {view.status === "already_paid" && (
          <>
            <h1 className="text-3xl font-semibold tracking-tight !text-white">
              You already have full access
            </h1>
            <p className="mt-4 text-text-muted">
              Your account already has full ESAT Camp access, so you don&apos;t
              need to redeem this code.
            </p>
            <Link
              href={APP_ROUTES.dashboard}
              className="mt-8 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </Container>
    </main>
  );
}
