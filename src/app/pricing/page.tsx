"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PricingTable, type PricingTier } from "@/components/ui";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useSubscription } from "@/hooks/useSubscription";
import { getSeasonPassPrice, getWeeksUntilExam, type PlanId } from "@/lib/stripe/best-value";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
  const [loading, setLoading] = useState<string | null>(null);

  const seasonPrice = getSeasonPassPrice();
  const perWeekSeason = seasonPrice / getWeeksUntilExam();

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
            : "Upgrade",
    },
    {
      id: "monthly",
      name: "Monthly",
      price: "£25",
      caption: "£6.25/week",
      features: FEATURES.paid,
      highlighted: true,
      ctaLabel:
        loading === "monthly"
          ? "Loading…"
          : tier === "monthly"
            ? "Current plan"
            : "Upgrade",
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
            : "Upgrade",
    },
  ];

  const fromSettings = searchParams.get("from") === "settings";

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
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-58px)] overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Green dot field — same pattern as homepage, green tint */}
        <div
          className="absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(169, 177, 103, 0.42) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Soft professional rays — lightweight CSS, no blur */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: [
              "linear-gradient(118deg, transparent 40%, rgba(169, 177, 103, 0.10) 50%, transparent 60%)",
              "linear-gradient(98deg, transparent 34%, rgba(169, 177, 103, 0.075) 47%, transparent 58%)",
              "linear-gradient(138deg, transparent 26%, rgba(169, 177, 103, 0.11) 52%, transparent 70%)",
            ].join(", "),
          }}
        />
        {/* Central overhead ray */}
        <div
          className="absolute left-1/2 top-0 h-[60%] w-[min(94vw,44rem)] -translate-x-1/2 opacity-70"
          style={{
            background:
              "conic-gradient(from 180deg at 50% -8%, transparent 156deg, rgba(169, 177, 103, 0.12) 174deg, rgba(169, 177, 103, 0.18) 180deg, rgba(169, 177, 103, 0.12) 186deg, transparent 204deg)",
          }}
        />
        {/* Gentle top wash */}
        <div
          className="absolute left-1/2 top-[-6rem] h-[26rem] w-[min(90vw,36rem)] -translate-x-1/2 opacity-45"
          style={{
            background:
              "radial-gradient(circle at center, rgba(169, 177, 103, 0.2) 0%, transparent 68%)",
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
    </div>
  );
}
