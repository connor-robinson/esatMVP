import { Suspense } from "react";
import {
  formatGbpPrice,
  getMonthlyDiscountPercent,
  getMonthlyPricePerWeek,
  getSeasonPassPrice,
  MONTHLY_LIST_PRICE_GBP,
  MONTHLY_PRICE_GBP,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
} from "@/lib/stripe/best-value";
import PricingPageClient from "./PricingPageClient";

const FREE_FEATURES = [
  "Mental maths: Addition module only",
  "Past papers: First 3 roadmap items",
  "Question Bank: 10 free questions per subject",
  "No solutions or stats overview",
  "No drills / flashcard mode",
] as const;

const PAID_FEATURES = [
  "Full mental maths access",
  "Full roadmap & past papers",
  "Unlimited Question Bank",
  "Solutions & stats overview",
  "Drills & flashcard mode",
] as const;

/**
 * Server-rendered pricing summary so crawlers see an H1, plan names, prices,
 * features and CTA labels in the initial HTML. Interactive checkout stays in
 * PricingPageClient.
 */
export default function PricingPage() {
  const seasonPrice = getSeasonPassPrice();
  const monthlyLabel = formatGbpPrice(MONTHLY_PRICE_GBP);
  const monthlyPerWeek = formatGbpPrice(getMonthlyPricePerWeek());
  const discount = getMonthlyDiscountPercent();

  const plans = [
    {
      name: "Free",
      price: "£0",
      note: "Limited preview access",
      features: FREE_FEATURES,
      cta: "Continue free",
    },
    {
      name: "Weekly",
      price: "£8/week",
      note: "Billed weekly. Cancel anytime",
      features: PAID_FEATURES,
      cta: "Start free trial",
    },
    {
      name: "Monthly",
      price: `${monthlyLabel}/month`,
      note: `Was ${formatGbpPrice(MONTHLY_LIST_PRICE_GBP)}. Save ${discount}%. About ${monthlyPerWeek}/week`,
      features: PAID_FEATURES,
      cta: "Start free trial",
    },
    {
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      note: `One-time payment. Access until ${SEASON_PASS_ACCESS_UNTIL_LABEL}`,
      features: PAID_FEATURES,
      cta: "Upgrade",
    },
  ] as const;

  return (
    <>
      <section className="border-b border-border/40 bg-background px-4 pb-2 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Choose your plan
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
            Compare Free, Weekly, Monthly and Exam Season Pass. Paid plans unlock
            full past papers, the question bank, mental maths and analytics.
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className="rounded-organic-lg bg-surface-elevated px-4 py-4 text-left"
            >
              <h2 className="text-base font-bold text-text">{plan.name}</h2>
              <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                {plan.price}
              </p>
              <p className="mt-1 text-xs text-text-muted">{plan.note}</p>
              <ul className="mt-3 space-y-1.5 text-xs leading-snug text-text-muted">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold text-primary">{plan.cta}</p>
            </article>
          ))}
        </div>
      </section>
      <Suspense fallback={null}>
        <PricingPageClient />
      </Suspense>
    </>
  );
}
