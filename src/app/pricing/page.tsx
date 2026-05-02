"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getBestValuePlan,
  getWeeksUntilExam,
  getSeasonPassPrice,
  type PlanId,
} from "@/lib/stripe/best-value";
import { Zap, ArrowRight } from "lucide-react";

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

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const { tier } = useSubscription();
  const [weeksInput, setWeeksInput] = useState<number | "">("");
  const [loading, setLoading] = useState<string | null>(null);

  const weeksUntilExam = getWeeksUntilExam();
  const weeks = typeof weeksInput === "number" ? weeksInput : weeksUntilExam;
  const { reason } = getBestValuePlan(weeks);
  const seasonPrice = getSeasonPassPrice();

  const perWeekSeason = seasonPrice / weeks;

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
      features: FEATURES.paid,
      ctaLabel:
        loading === "weekly"
          ? "Loading…"
          : tier === "weekly"
            ? "Current plan"
            : "Subscribe",
    },
    {
      id: "monthly",
      name: "Monthly",
      price: "£25",
      caption: "£6.25/week",
      features: FEATURES.paid,
      ctaLabel:
        loading === "monthly"
          ? "Loading…"
          : tier === "monthly"
            ? "Current plan"
            : "Subscribe",
    },
    {
      id: "season_pass",
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      caption: `~ £${perWeekSeason.toFixed(1)}/week`,
      priceNote: "One-time — access until 1 Oct 2026",
      features: FEATURES.paid,
      featured: true,
      ctaLabel:
        loading === "season_pass"
          ? "Loading…"
          : tier === "season_pass"
            ? "Current plan"
            : "Get access",
    },
  ];

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      router.replace("/pricing");
      window.history.replaceState({}, "", "/pricing");
    }
  }, [searchParams, router]);

  const handleCheckout = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      router.push("/login?redirect=/pricing");
      return;
    }
    setLoading(planType);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error ?? "Failed");
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  };

  return (
    <Container size="xl" className="bg-background pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div className="mb-12 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-[2.5rem] md:leading-tight">
          Choose your plan
        </h1>
        <p className="mx-auto max-w-xl text-base text-text-muted sm:text-lg">
          Transparent pricing to help you make the best decision possible.
        </p>

        <div className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-3 rounded-organic-xl border border-border-subtle bg-surface-elevated px-4 py-3 ring-1 ring-white/[0.04]">
          <label className="text-sm text-text-subtle">
            I&apos;m preparing for
          </label>
          <input
            type="number"
            min={1}
            max={52}
            placeholder={`${weeksUntilExam} weeks`}
            value={weeksInput === "" ? "" : weeksInput}
            onChange={(e) => {
              const v = e.target.value;
              setWeeksInput(v === "" ? "" : Math.max(1, parseInt(v, 10) || 1));
            }}
            className="w-24 rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-center text-sm text-text tabular-nums outline-none transition-colors focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          <span className="text-sm text-text-muted">weeks until exam</span>
        </div>
        {weeks >= 17 && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <Zap className="h-4 w-4 shrink-0" aria-hidden />
            <span>{reason}</span>
          </p>
        )}
      </div>

      <PricingTable
        tiers={tiers}
        onSelect={(id) => {
          if (id === "free") {
            if (tier !== "free") router.push("/profile");
            return;
          }
          if (id === "weekly" || id === "monthly" || id === "season_pass") {
            handleCheckout(id);
          }
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
  );
}
