"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  getBestValuePlan,
  getWeeksUntilExam,
  getSeasonPassPrice,
  type PlanId,
} from "@/lib/stripe/best-value";
import { Zap } from "lucide-react";

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

export function SettingsPricingPanel() {
  const router = useRouter();
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

  const handleCheckout = async (planType: PlanId) => {
    if (planType === "free") return;
    if (!session?.user) {
      router.push("/login?redirect=/profile");
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", "/profile?section=pricing");
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold text-text">Pricing</h2>
        <p className="text-sm text-text-muted">
          Choose a plan that fits your exam timeline.
        </p>
      </div>

      <div className="flex max-w-md flex-wrap items-center gap-3 rounded-organic-xl bg-surface-elevated px-4 py-3">
        <label className="text-sm text-text-subtle">I&apos;m preparing for</label>
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
          className="w-24 rounded-organic-md bg-surface-mid px-3 py-2 text-center text-sm text-text tabular-nums outline-none transition-colors focus-visible:bg-surface-neutral"
        />
        <span className="text-sm text-text-muted">weeks until exam</span>
      </div>

      {weeks >= 17 && (
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
          <span>{reason}</span>
        </p>
      )}

      <PricingTable
        tiers={tiers}
        onSelect={(id) => {
          if (id === "free") return;
          if (id === "weekly" || id === "monthly" || id === "season_pass") {
            handleCheckout(id);
          }
        }}
      />
    </div>
  );
}
