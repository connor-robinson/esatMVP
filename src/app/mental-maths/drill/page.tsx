import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  AppSeoFaq,
  AppSeoList,
  AppSeoRelatedLinks,
  AppSeoSection,
} from "@/components/seo/AppSeoSection";
import { seoLinks } from "@/lib/seo/links";
import {
  APP_ROUTES,
  SEO_ROUTES,
  buildSeoMetadata,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/seo/config";
import {
  DRILL_EXAMPLE_ITEMS,
  DRILL_FAQ,
  DRILL_PAGE_DESCRIPTION,
  DRILL_PAGE_PATH,
  DRILL_PAGE_TITLE,
} from "@/lib/seo/drillPageCopy";
import { DrillPageClient } from "./DrillPageClient";

export const metadata: Metadata = buildSeoMetadata({
  title: DRILL_PAGE_TITLE,
  description: DRILL_PAGE_DESCRIPTION,
  path: DRILL_PAGE_PATH,
  keywords: [
    "ESAT no-calculator practice",
    "ESAT mental maths",
    "ESAT calculator rules",
    "no calculator admissions test",
    "ESAT speed practice",
  ],
});

export default function MentalMathsDrillPage() {
  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "ESAT no-calculator trainer",
            description: DRILL_PAGE_DESCRIPTION,
            path: DRILL_PAGE_PATH,
          }),
          faqPageSchema(DRILL_FAQ),
        ]}
      />

      <Container size="md" className="space-y-4 py-6 sm:py-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Practice
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            ESAT No-Calculator Practice
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-text-muted sm:text-[15px]">
            The ESAT does not allow calculators. Calculation fluency is part of
            the exam: you need to manipulate numbers, fractions, ratios and
            formulae quickly enough that the maths does not get in the way of the
            reasoning.
          </p>
        </header>

        <AppSeoSection
          heading="Representative drill examples"
          paragraphs={[
            "These are the kinds of short, timed sets the trainer runs. Pick a topic below and start a session when you are ready.",
          ]}
        >
          <AppSeoList items={DRILL_EXAMPLE_ITEMS} />
        </AppSeoSection>
      </Container>

      <DrillPageClient />

      <Container size="md" className="space-y-5 py-10 sm:py-14">
        <AppSeoSection
          heading="Why this matters for the science modules"
          paragraphs={[
            "No-calculator weakness does not only affect Maths 1. It also slows Physics, Chemistry and Biology questions whenever ratios, units, powers or graph gradients are involved.",
          ]}
        />

        <AppSeoFaq items={DRILL_FAQ} />

        <AppSeoRelatedLinks
          links={seoLinks(
            "calculatorRules",
            "maths1",
            "physics",
            "calibration",
            "fermiGame",
            "preparation",
          )}
        />

        <p className="text-xs leading-relaxed text-text-muted">
          See the full preparation sequence in the{" "}
          <a
            href={SEO_ROUTES.preparation}
            className="text-primary underline-offset-2 hover:underline"
          >
            ESAT preparation guide
          </a>
          .
        </p>
      </Container>
    </>
  );
}
