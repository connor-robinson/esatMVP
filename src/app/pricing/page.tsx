"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button, PricingTable, type PricingTier } from "@/components/ui";
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
  const { plan: bestPlan, reason } = getBestValuePlan(weeks);
  const seasonPrice = getSeasonPassPrice();

  const tiers: PricingTier[] = [
    {
      id: "free",
      name: "Free",
      price: "£0",
      caption: "Starter access",
      features: FEATURES.free,
      ctaLabel: tier === "free" ? "Current plan" : "Downgrade via profile",
      highlighted: false,
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
      highlighted: bestPlan === "weekly",
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
      highlighted: bestPlan === "monthly",
    },
    {
      id: "season_pass",
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      caption: `one-time · ~£${(seasonPrice / weeks).toFixed(1)}/week`,
      features: FEATURES.paid,
      ctaLabel:
        loading === "season_pass"
          ? "Loading…"
          : tier === "season_pass"
            ? "Current plan"
            : "Get access",
      highlighted: bestPlan === "season_pass",
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
    <Container size="xl" className="py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text mb-2">Choose your plan</h1>
        <p className="text-text-muted max-w-xl mx-auto">
          Prepare for ESAT / TMUA. Full access to past papers, mental maths, and
          question bank.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <label className="text-sm text-text-muted">
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
            className="w-24 px-3 py-2 rounded-lg bg-surface border border-border text-text"
          />
          <span className="text-sm text-text-muted">weeks</span>
        </div>
        {weeks >= 17 && (
          <p className="mt-4 text-primary font-medium flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            {reason}
          </p>
        )}
      </div>

      <PricingTable
        tiers={tiers}
        onSelect={(id) => {
          if (id === "free") return;
          if (id === "weekly" || id === "monthly" || id === "season_pass") {
            handleCheckout(id);
          }
        }}
      />

      <div className="mt-12 text-center">
        {!session?.user ? (
          <p className="text-text-muted text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to subscribe. Already have access?{" "}
            <Link href="/profile" className="text-primary hover:underline inline-flex items-center gap-1">
              Manage subscription <ArrowRight className="w-4 h-4" />
            </Link>
          </p>
        ) : (
          <p className="text-text-muted text-sm">
            <Link href="/profile" className="text-primary hover:underline inline-flex items-center gap-1">
              Manage subscription <ArrowRight className="w-4 h-4" />
            </Link>
          </p>
        )}
      </div>
    </Container>
  );
}
