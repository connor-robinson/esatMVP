"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getSeasonPassPrice,
  getWeeksUntilExam,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
  type PlanId,
} from "@/lib/stripe/best-value";
import {
  buildCheckoutSignupUrl,
  isPaidPlanId,
  type PaidPlanId,
} from "@/lib/pricing/checkoutAuth";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  currentGaPath,
  readGaSourcePage,
  rememberGaSourcePage,
  trackEvent,
  trackEventOnce,
} from "@/lib/ga";

const FEATURES = {
  free: [
    "Mental maths: Addition module only",
    "Past papers: First 3 roadmap items",
    "Question Bank: 10 free questions per subject",
    "No solutions or stats overview",
    "No drills / flashcard mode",
  ],
  paid: [
    "Full mental maths access",
    "Full roadmap & past papers",
    "Unlimited Question Bank",
    "Solutions & stats overview",
    "Drills & flashcard mode",
  ],
};

const PAID_RECURRING = new Set(["weekly", "monthly"]);

function formatPeriodEnd(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const {
    tier,
    hasFullAccess,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    pendingPlan,
    source,
  } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const autoCheckoutStarted = useRef(false);

  const seasonPrice = getSeasonPassPrice();
  const perWeekSeason = seasonPrice / getWeeksUntilExam();
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const isRecurringPaid = PAID_RECURRING.has(tier);
  const isSeasonPass = tier === "season_pass";
  const isPartnerAccess = tier === "partner" || source === "partner";

  useEffect(() => {
    const sourcePage = readGaSourcePage() ?? currentGaPath() ?? "/pricing";
    rememberGaSourcePage(sourcePage);
    trackEventOnce("pricing_viewed", "pricing_viewed", {
      source_page: sourcePage,
    });
  }, []);

  const paidCta = (planId: "weekly" | "monthly" | "season_pass", loadingLabel: string) => {
    if (loading === planId) return "Loading…";
    if (isPartnerAccess) return "Included with your access";
    if (tier === planId) return "Current plan";

    if (isSeasonPass) {
      return "Available after pass ends";
    }

    if (isRecurringPaid) {
      if (planId === "season_pass" && cancelAtPeriodEnd && pendingPlan === "season_pass") {
        return periodEndLabel ? `Ends ${periodEndLabel}` : "Ending soon";
      }
      return "Switch";
    }

    return loadingLabel;
  };

  const tiers: PricingTier[] = [
    {
      id: "free",
      name: "Free",
      price: "£0",
      features: FEATURES.free,
      ctaLabel: isPartnerAccess
        ? "Institution access active"
        : tier === "free"
          ? "Current plan"
          : "Downgrade via profile",
    },
    {
      id: "weekly",
      name: "Weekly",
      price: "£8",
      caption: "per week",
      priceNote: isRecurringPaid && tier !== "weekly"
        ? "Switch at next billing date. No charge today"
        : undefined,
      features: FEATURES.paid,
      ctaLabel: paidCta("weekly", "Upgrade"),
    },
    {
      id: "monthly",
      name: "Monthly",
      price: "£25",
      caption: "£6.25/week",
      priceNote: isRecurringPaid && tier !== "monthly"
        ? "Switch at next billing date. No charge today"
        : "7-day free trial. Card required. Then £25/month. Cancel anytime",
      features: FEATURES.paid,
      highlighted: true,
      ctaLabel: paidCta("monthly", "Start free trial"),
    },
    {
      id: "season_pass",
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      caption: `~ £${perWeekSeason.toFixed(1)}/week`,
      priceNote:
        isRecurringPaid && cancelAtPeriodEnd && pendingPlan === "season_pass"
          ? periodEndLabel
            ? `Current plan ends ${periodEndLabel}, then buy Season Pass`
            : "Current plan ending, then buy Season Pass"
          : isRecurringPaid
            ? "Finish your current plan first. No overlap charge"
            : `One-time payment. Access until ${SEASON_PASS_ACCESS_UNTIL_LABEL}`,
      features: FEATURES.paid,
      featured: true,
      ctaLabel: paidCta("season_pass", "Upgrade"),
    },
  ];

  const fromSettings = searchParams.get("from") === "settings";

  const handleCheckout = async (planType: PaidPlanId) => {
    if (isPartnerAccess) {
      setBanner(
        "You already have full access through your institution programme. No payment is needed.",
      );
      return;
    }
    if (!session?.user) {
      const sourcePage = currentGaPath() ?? "/pricing";
      rememberGaSourcePage(sourcePage);
      trackEvent("checkout_signup_required", {
        selected_plan: planType,
        source_page: sourcePage,
      });
      router.push(buildCheckoutSignupUrl(planType));
      return;
    }
    setLoading(planType);
    setBanner(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.url) {
        // Genuine checkout: Stripe session created and redirect about to happen.
        trackEvent("begin_checkout", {
          plan_type: planType,
          currency: "GBP",
        });
        window.location.href = data.url;
        return;
      }
      throw new Error("checkout_failed");
    } catch {
      setLoading(null);
      setBanner("Could not start checkout. Try again.");
    }
  };

  useEffect(() => {
    const checkoutPlan = searchParams.get("checkout");
    if (!session?.user || !isPaidPlanId(checkoutPlan)) return;
    if (autoCheckoutStarted.current) return;
    if (isPartnerAccess || isSeasonPass || isRecurringPaid) return;
    autoCheckoutStarted.current = true;
    router.replace("/pricing", { scroll: false });
    void handleCheckout(checkoutPlan);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume checkout once after signup
  }, [session?.user, searchParams, isSeasonPass, isRecurringPaid, isPartnerAccess]);

  const handleSwitch = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      const sourcePage = currentGaPath() ?? "/pricing";
      rememberGaSourcePage(sourcePage);
      trackEvent("checkout_signup_required", {
        selected_plan: planType,
        source_page: sourcePage,
      });
      router.push(buildCheckoutSignupUrl(planType));
      return;
    }
    setLoading(planType);
    setBanner(null);
    try {
      const res = await fetch("/api/stripe/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Switch failed");
      setBanner(data.message ?? "Plan switch scheduled.");
      // Refresh so CTAs update
      window.location.reload();
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Could not switch plan.");
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(169, 177, 103, 0.42) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: [
              "linear-gradient(118deg, transparent 42%, rgba(169, 177, 103, 0.06) 50%, transparent 58%)",
              "linear-gradient(98deg, transparent 36%, rgba(169, 177, 103, 0.045) 47%, transparent 57%)",
              "linear-gradient(138deg, transparent 28%, rgba(169, 177, 103, 0.065) 52%, transparent 68%)",
            ].join(", "),
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-[55%] w-[min(90vw,40rem)] -translate-x-1/2 opacity-35"
          style={{
            background:
              "conic-gradient(from 180deg at 50% -8%, transparent 160deg, rgba(169, 177, 103, 0.07) 174deg, rgba(169, 177, 103, 0.1) 180deg, rgba(169, 177, 103, 0.07) 186deg, transparent 200deg)",
          }}
        />
        <div
          className="absolute left-1/2 top-[-6rem] h-[26rem] w-[min(90vw,36rem)] -translate-x-1/2 opacity-28"
          style={{
            background:
              "radial-gradient(circle at center, rgba(169, 177, 103, 0.14) 0%, transparent 68%)",
          }}
        />
      </div>

      <Container size="xl" className="relative pb-16 pt-12 sm:pb-24 sm:pt-16">
        {fromSettings ? (
          <div className="mb-8 sm:mb-10">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to settings
            </Link>
          </div>
        ) : null}

        <div className="mb-10 text-center sm:mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Choose your plan
          </h1>
          {hasFullAccess && periodEndLabel && isRecurringPaid ? (
            <p className="mt-3 text-sm text-text-muted">
              Current plan renews / ends {periodEndLabel}
              {cancelAtPeriodEnd ? " (set to end, no further renewals)" : ""}.
            </p>
          ) : null}
          {banner ? (
            <p className="mx-auto mt-4 max-w-xl rounded-organic-lg bg-primary/15 px-4 py-3 text-sm text-text">
              {banner}
            </p>
          ) : null}
          <p className="mx-auto mt-4 max-w-2xl text-sm text-text-muted">
            Free includes 10 questions per subject. Monthly starts with a 7-day
            free trial; a card is required and you are charged £25/month after
            the trial unless you cancel.
          </p>
        </div>

        <PricingTable
          tiers={tiers}
          onSelect={(id) => {
            if (id === "free") {
              if (tier !== "free") router.push("/profile");
              return;
            }
            if (id !== "weekly" && id !== "monthly" && id !== "season_pass") return;

            // Season-pass holders keep prepaid access until Oct - no mid-pass switch
            if (isSeasonPass) return;

            // Already scheduled season-pass end - don't re-fire
            if (
              id === "season_pass" &&
              cancelAtPeriodEnd &&
              pendingPlan === "season_pass"
            ) {
              return;
            }

            if (isRecurringPaid) {
              handleSwitch(id);
              return;
            }

            void handleCheckout(id);
          }}
        />

        <div className="mt-14 text-center">
          {!session?.user ? (
            <p className="text-sm text-text-muted">
              <Link
                href="/login?mode=signup&redirectTo=%2Fpricing"
                className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Create an account to subscribe.
              </Link>{" "}
              Already have access?{" "}
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Manage subscription
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Manage subscription
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
