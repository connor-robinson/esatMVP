import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

/**
 * Server-rendered H1 for crawlers. Interactive checkout and plan cards live in
 * PricingPageClient (which also SSRs).
 */
export default function PricingPage() {
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
      </section>
      <Suspense fallback={null}>
        <PricingPageClient />
      </Suspense>
    </>
  );
}
