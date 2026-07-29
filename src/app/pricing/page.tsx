"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { getSeasonPassPrice, getWeeksUntilExam, type PlanId } from "@/lib/stripe/best-value";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/ga";

const FEATURES = {
  free: [
    "Mental maths: Addition module only",
    "Past papers: First 3 roadmap items",
    "Question Bank: 10 free questions",
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
  } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const seasonPrice = getSeasonPassPrice();
  const perWeekSeason = seasonPrice / getWeeksUntilExam();
  const periodEndLabel = formatPeriodEnd(currentPeriodEnd);
  const isRecurringPaid = PAID_RECURRING.has(tier);
  const isSeasonPass = tier === "season_pass";

  const paidCta = (planId: "weekly" | "monthly" | "season_pass", loadingLabel: string) => {
    if (loading === planId) return "Loading…";
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
      ctaLabel: tier === "free" ? "Current plan" : "Downgrade via profile",
    },
    {
      id: "weekly",
      name: "Weekly",
      price: "£8",
      caption: "per week",
      priceNote: isRecurringPaid && tier !== "weekly"
        ? "Switch at next billing date — no charge today"
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
        ? "Switch at next billing date — no charge today"
        : "7-day free trial — cancel anytime",
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
            ? `Current plan ends ${periodEndLabel} — then buy Season Pass`
            : "Current plan ending — then buy Season Pass"
          : isRecurringPaid
            ? "Finish your current plan first — no overlap charge"
            : "One-time — access until 1 Oct 2026",
      features: FEATURES.paid,
      featured: true,
      ctaLabel: paidCta("season_pass", "Upgrade"),
    },
  ];

  const fromSettings = searchParams.get("from") === "settings";

  const handleCheckout = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoading(planType);
    setBanner(null);
    trackEvent("checkout_started", { plan_type: planType });
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Failed");
    } catch {
      setLoading(null);
      setBanner("Could not start checkout. Try again.");
    }
  };

  const handleSwitch = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      router.push("/login?redirect=/pricing");
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
              {cancelAtPeriodEnd ? " (set to end — no further renewals)" : ""}.
            </p>
          ) : null}
          {banner ? (
            <p className="mx-auto mt-4 max-w-xl rounded-organic-lg bg-primary/15 px-4 py-3 text-sm text-text">
              {banner}
            </p>
          ) : null}
        </div>

        <PricingTable
          tiers={tiers}
          onSelect={(id) => {
            if (id === "free") {
              if (tier !== "free") router.push("/profile");
              return;
            }
            if (id !== "weekly" && id !== "monthly" && id !== "season_pass") return;

            // Season-pass holders keep prepaid access until Oct — no mid-pass switch
            if (isSeasonPass) return;

            // Already scheduled season-pass end — don't re-fire
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

            handleCheckout(id);
          }}
        />

        <div className="mt-14 text-center">
          {!session?.user ? (
            <p className="text-sm text-text-muted">
              <Link
                href="/login?redirect=/pricing"
                className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                Sign in to subscribe.
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
