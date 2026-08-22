import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { ScoreConverterLegacy } from "@/components/tools/scoreConverterLegacy/ScoreConverterLegacy";
import { SCORE_CONVERTER_FAQ_ITEMS } from "@/components/tools/scoreConverter/ScoreConverterFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { AppSeoCta } from "@/components/seo/AppSeoCta";
import {
  AppSeoRelatedLinks,
  AppSeoSection,
} from "@/components/seo/AppSeoSection";
import { seoLinks } from "@/lib/seo/links";
import {
  APP_ROUTES,
  buildSeoMetadata,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/seo/config";

/**
 * Snapshot of the score converter UI as of mid-July 2026 (last state before the
 * post-12-August redesign). Kept for side-by-side comparison with
 * `/tools/score-converter`. Not indexed.
 */
const PATH = "/tools/score-converter-legacy";

const TITLE = "ESAT Score Converter (pre-August 2026 archive)";
const DESCRIPTION =
  "Archived score converter UI from before the August 2026 redesign. For comparison only.";

export const metadata: Metadata = {
  ...buildSeoMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
  }),
  robots: { index: false, follow: true },
};

export default function ScoreConverterLegacyPage() {
  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "ESAT score converter (archive)",
            description: DESCRIPTION,
            path: PATH,
          }),
          faqPageSchema(SCORE_CONVERTER_FAQ_ITEMS),
        ]}
      />

      <Container size="lg" className="pt-8 sm:pt-10">
        <div className="rounded-organic-xl bg-surface-elevated p-4 sm:p-5">
          <p className="text-sm font-semibold text-text">
            Archive: score converter before 12 August 2026
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            This is the old UI restored for comparison. The live converter is at{" "}
            <a
              href={APP_ROUTES.scoreConverter}
              className="font-semibold text-secondary hover:underline"
            >
              /tools/score-converter
            </a>
            .
          </p>
        </div>
      </Container>

      <Container size="lg" className="pt-6 sm:pt-8">
        <div className="rounded-organic-xl bg-surface-elevated p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-text-muted sm:text-[15px]">
            Use this converter to estimate how a raw mark from a past NSAA, ENGAA
            or TMUA paper might translate to the ESAT 1.0–9.0 score scale. Treat
            the result as a guide, not an official score.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-text-muted sm:text-[15px]">
            Official ESAT scaling depends on the cohort and the test version. Use
            the estimate to guide preparation, not to make final admissions
            assumptions.
          </p>
        </div>
      </Container>

      <ScoreConverterLegacy />

      <Container size="lg" className="space-y-5 pb-16">
        <AppSeoSection
          heading="What to do after estimating your score"
          paragraphs={[
            "A score estimate is useful only if it changes your practice. If one module is weaker, start there. If your score is close to your target but unstable between sets, focus on timing and error reduction rather than new content.",
            "Universities receive a separate score for each module you sit, so an uneven profile matters more than a single overall figure.",
          ]}
        >
          <AppSeoCta href={APP_ROUTES.calibration} placement="score_converter_legacy_outro">
            Start free calibration
          </AppSeoCta>
        </AppSeoSection>

        <AppSeoRelatedLinks
          links={seoLinks("goodScore", "calibration", "preparation", "pastPapers")}
        />

        <p className="text-xs leading-relaxed text-text-muted">
          Estimate only, not official UAT-UK scoring. ESATCAMP is an independent
          preparation resource and is not affiliated with or endorsed by UAT-UK,
          Pearson VUE or any university.
        </p>
      </Container>
    </>
  );
}
