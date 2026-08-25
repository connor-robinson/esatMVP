import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";
import { PublishedConversionTables } from "@/components/tools/scoreConverter/PublishedConversionTables";
import { SCORE_CONVERTER_FAQ_ITEMS } from "@/components/tools/scoreConverter/ScoreConverterFaq";
import { NsaaConversionYearNav } from "@/components/tools/scoreConverter/nsaaYear/NsaaConversionYearNav";
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
import { MAIN_SCORE_CONVERTER_COPY } from "@/lib/scoreConverter/scoreConverterPageCopy";

const PATH = APP_ROUTES.scoreConverter;

export const metadata: Metadata = buildSeoMetadata({
  title: MAIN_SCORE_CONVERTER_COPY.title,
  description: MAIN_SCORE_CONVERTER_COPY.description,
  path: PATH,
  keywords: [
    "ESAT score converter",
    "ESAT score conversion",
    "ESAT conversion tables",
    "raw mark conversion",
    "NSAA to ESAT conversion",
    "ENGAA to ESAT conversion",
    "ESAT percentile calculator",
    "NSAA score converter",
    "ENGAA score converter",
    "TMUA score converter",
  ],
});

export default function ScoreConverterPage() {
  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "ESAT score converter",
            description: MAIN_SCORE_CONVERTER_COPY.description,
            path: PATH,
          }),
          faqPageSchema(SCORE_CONVERTER_FAQ_ITEMS),
        ]}
      />

      <div className="pt-6">
        <NsaaConversionYearNav heading="NSAA score conversion by year" />
      </div>

      <ScoreConverter
        initialExam="NSAA"
        pageTitle={MAIN_SCORE_CONVERTER_COPY.h1}
        intro={MAIN_SCORE_CONVERTER_COPY.intro}
        beforeFaq={<PublishedConversionTables />}
      />

      <Container size="lg" className="space-y-5 pb-16">
        <AppSeoSection
          heading="What to do after estimating your score"
          paragraphs={[
            "A score estimate is useful only if it changes your practice. If one module is weaker, start there. If your score is close to your target but unstable between sets, focus on timing and error reduction rather than new content.",
            "Universities receive a separate score for each module you sit, so an uneven profile matters more than a single overall figure.",
          ]}
        >
          <AppSeoCta
            href={APP_ROUTES.calibration}
            placement="score_converter_outro"
            ctaName="start_free_calibration"
          >
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
