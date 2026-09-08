import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { AppSeoCta } from "@/components/seo/AppSeoCta";
import {
  AppSeoRelatedLinks,
  AppSeoSection,
} from "@/components/seo/AppSeoSection";
import { PatScoreConverter } from "@/components/tools/patScoreConverter/PatScoreConverter";
import { PAT_SCORE_CONVERTER_FAQ_ITEMS } from "@/components/tools/patScoreConverter/PatScoreConverterFaq";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import { PAT_SCORE_CONVERTER_PATH } from "@/lib/patScoreConverter";
import { seoLinks } from "@/lib/seo/links";
import {
  APP_ROUTES,
  breadcrumbSchema,
  buildSeoMetadata,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/seo/config";

const PATH = PAT_SCORE_CONVERTER_PATH;

const TITLE = "PAT Score Converter | Oxford PAT Percentile & ESAT Estimate";
const DESCRIPTION =
  "Enter your Oxford PAT past-paper score to estimate your historical percentile, compare it with that year's applicant cohort and see a rough ESAT Physics percentile-equivalent.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "PAT score converter",
    "PAT score calculator",
    "PAT percentile",
    "PAT score distribution",
    "PAT to ESAT",
    "PAT 2023 score",
    "PAT 2022 score",
    "Oxford PAT converter",
  ],
});

export default async function PatScoreConverterPage() {
  let esatPhysicsRows: Awaited<ReturnType<typeof readEsatTableRows>> = [];
  try {
    esatPhysicsRows = await readEsatTableRows("esat_physics_cumulative");
  } catch {
    esatPhysicsRows = [];
  }

  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "PAT Score Converter",
            description: DESCRIPTION,
            path: PATH,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Score converter", path: APP_ROUTES.scoreConverter },
            { name: "PAT Score Converter", path: PATH },
          ]),
          faqPageSchema([...PAT_SCORE_CONVERTER_FAQ_ITEMS]),
        ]}
      />

      <PatScoreConverter esatPhysicsRows={esatPhysicsRows} />

      <Container size="lg" className="space-y-5 pb-16">
        <AppSeoSection
          heading="What to do after estimating your PAT score"
          paragraphs={[
            "A historical PAT percentile is useful only if it changes your practice. If the estimate is weaker than you need, spend the next sessions on the topics that cost marks, then sit another timed paper from the same PAT era.",
            "PAT and ESAT are different tests. Use the ESAT Physics percentile-equivalent to choose practice difficulty, not as a score Oxford will see.",
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
          links={seoLinks("oxfordRequirements", "physics", "scoreConverter", "pastPapers")}
        />

        <p className="text-xs leading-relaxed text-text-muted">
          Estimate only, not official Oxford or UAT-UK scoring. ESATCAMP is an
          independent preparation resource and is not affiliated with or endorsed
          by the University of Oxford, UAT-UK, Pearson VUE or any university.
        </p>
      </Container>
    </>
  );
}
