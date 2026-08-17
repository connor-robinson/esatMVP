"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/ga";

type SyncState = "syncing" | "unlocked" | "pending" | "error";

const ACCESS_CACHE_KEY = "nocalc:subscriptionHasFullAccess";

function PricingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState<SyncState>("syncing");
  const [tier, setTier] = useState<string | null>(null);
  const [message, setMessage] = useState("Confirming your payment…");
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function run() {
      if (!sessionId) {
        setState("error");
        setMessage("Missing checkout session. Open Pricing and try again.");
        return;
      }

      try {
        const syncRes = await fetch("/api/stripe/sync-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const syncData = await syncRes.json().catch(() => ({}));

        if (!syncRes.ok) {
          throw new Error(syncData.error ?? "Could not confirm payment");
        }

        if (cancelled) return;

        if (
          syncData.paymentStatus === "paid" ||
          syncData.paymentStatus === "no_payment_required"
        ) {
          setDetails(
            syncData.planType
              ? `Plan: ${String(syncData.planType).replace("_", " ")}`
              : null
          );
        }

        setMessage("Payment confirmed. Unlocking your account…");

        while (attempts < 12 && !cancelled) {
          attempts += 1;
          const statusRes = await fetch("/api/subscription/status", {
            cache: "no-store",
          });
          const status = await statusRes.json();

          if (status.hasFullAccess) {
            try {
              sessionStorage.setItem(ACCESS_CACHE_KEY, "true");
            } catch {
              /* ignore */
            }
            setTier(status.tier ?? null);
            setState("unlocked");
            setMessage("You're all set. Full access is active.");

            try {
              const purchaseKey = `ga_purchase_${sessionId}`;
              if (sessionStorage.getItem(purchaseKey) !== "1") {
                sessionStorage.setItem(purchaseKey, "1");
                trackEvent("purchase", {
                  plan_type: syncData.planType
                    ? String(syncData.planType)
                    : status.tier
                      ? String(status.tier)
                      : undefined,
                  currency: "GBP",
                });
              }
            } catch {
              trackEvent("purchase", {
                plan_type: syncData.planType
                  ? String(syncData.planType)
                  : undefined,
                currency: "GBP",
              });
            }
            return;
          }

          await new Promise((r) => setTimeout(r, 1500));
        }

        if (!cancelled) {
          setState("pending");
          setMessage(
            "Payment went through, but access is still updating. Refresh in a moment or open Pricing again."
          );
        }
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Something went wrong confirming your payment. Please try again.");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="relative min-h-[calc(100vh-58px)] overflow-hidden bg-background">
      <Container
        size="md"
        className="relative flex min-h-[calc(100vh-58px)] items-center justify-center py-16"
      >
        <div className="w-full max-w-md rounded-organic-xl bg-surface-elevated p-8 text-center shadow-[0_20px_60px_-28px_rgba(0,0,0,0.55)]">
          {state === "syncing" ? (
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" aria-hidden />
          ) : null}
          {state === "unlocked" ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden />
          ) : null}
          {state === "pending" || state === "error" ? (
            <AlertCircle
              className={`mx-auto h-12 w-12 ${state === "error" ? "text-error" : "text-primary"}`}
              aria-hidden
            />
          ) : null}

          <h1 className="mt-6 text-2xl font-bold tracking-tight text-text">
            {state === "unlocked"
              ? "Payment successful"
              : state === "error"
                ? "Couldn’t confirm payment"
                : state === "pending"
                  ? "Payment received"
                  : "Confirming payment"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-text-muted">{message}</p>

          {details ? (
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-subtle">
              {details}
              {tier ? ` · Active tier: ${tier.replace("_", " ")}` : ""}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            {state === "unlocked" ? (
              <>
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-primary px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-primary-hover"
                >
                  Start practising
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-surface-mid px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                >
                  View your plan
                </Link>
              </>
            ) : null}

            {state === "pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-primary px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-primary-hover"
                >
                  Refresh status
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-surface-mid px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                >
                  Back to pricing
                </Link>
              </>
            ) : null}

            {state === "error" ? (
              <>
                <Link
                  href="/pricing"
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-primary px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-primary-hover"
                >
                  Back to pricing
                </Link>
                <button
                  type="button"
                  onClick={() => router.push("/profile")}
                  className="inline-flex w-full items-center justify-center rounded-organic-lg bg-surface-mid px-5 py-3 text-sm font-semibold text-text transition-colors hover:bg-surface-neutral"
                >
                  Open profile
                </button>
              </>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function PricingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-58px)] items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <PricingSuccessContent />
    </Suspense>
  );
}
