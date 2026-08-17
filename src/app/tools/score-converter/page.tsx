import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { ScoreConverter } from "@/components/tools/scoreConverter/ScoreConverter";
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

const PATH = APP_ROUTES.scoreConverter;

const TITLE = "ESAT Score Converter | Estimate Your ESAT Module Score";
const DESCRIPTION =
  "Estimate your ESAT module score from raw marks and understand what your score might mean for preparation. Estimate only, not official scoring.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT score converter",
    "ESAT raw marks",
    "ESAT score",
    "ESAT results",
    "ESAT score scale",
  ],
});

export default function ScoreConverterPage() {
  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "ESAT score converter",
            description: DESCRIPTION,
            path: PATH,
          }),
          faqPageSchema(SCORE_CONVERTER_FAQ_ITEMS),
        ]}
      />

      <ScoreConverter />

      <Container size="lg" className="space-y-5 pb-16">
        <AppSeoSection
          heading="What to do after estimating your score"
          paragraphs={[
            "A score estimate is useful only if it changes your practice. If one module is weaker, start there. If your score is close to your target but unstable between sets, focus on timing and error reduction rather than new content.",
            "Universities receive a separate score for each module you sit, so an uneven profile matters more than a single overall figure.",
          ]}
        >
          <AppSeoCta href={APP_ROUTES.calibration} placement="score_converter_outro">
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
