import { Suspense } from "react";
import {
  formatGbpPrice,
  getSeasonPassPrice,
  MONTHLY_LIST_PRICE_GBP,
  MONTHLY_PRICE_GBP,
  SEASON_PASS_ACCESS_UNTIL_LABEL,
} from "@/lib/stripe/best-value";
import PricingPageClient from "./PricingPageClient";

const FREE_FEATURES = [
  "5 free mocks",
  "Addition mental maths",
  "Sit any past paper",
  "10 questions per subject",
] as const;

const PAID_FEATURES = [
  "In-depth mock analysis",
  "Full mental maths",
  "Unlimited question bank",
  "Solutions, review, and stats",
  "Drills and flashcards",
] as const;

/**
 * Server-rendered pricing summary so crawlers see plan names, prices,
 * features and CTA labels in the initial HTML. Hidden visually via sr-only;
 * the interactive PricingTable in PricingPageClient is what users see.
 */
export default function PricingPage() {
  const seasonPrice = getSeasonPassPrice();
  const monthlyLabel = formatGbpPrice(MONTHLY_PRICE_GBP);

  const plans = [
    {
      name: "Free",
      price: "£0",
      note: "Free to start",
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
      note: `Was ${formatGbpPrice(MONTHLY_LIST_PRICE_GBP)}. 4-day free trial. Cancel anytime`,
      features: PAID_FEATURES,
      cta: "Start free trial",
    },
    {
      name: "Exam Season Pass",
      price: `£${seasonPrice}`,
      note: `One payment. Access until ${SEASON_PASS_ACCESS_UNTIL_LABEL}`,
      features: PAID_FEATURES,
      cta: "Upgrade",
    },
  ] as const;

  return (
    <>
      <section className="bg-background px-4 pb-0 pt-10 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Choose your plan
          </h1>
        </div>
        <div className="sr-only">
          <p>
            Free, Weekly, Monthly, and Exam Season Pass.
          </p>
          {plans.map((plan) => (
            <article key={plan.name}>
              <h2>{plan.name}</h2>
              <p>{plan.price}</p>
              <p>{plan.note}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p>{plan.cta}</p>
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
