import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { AppSeoCta } from "@/components/seo/AppSeoCta";
import {
  AppSeoRelatedLinks,
  AppSeoSection,
} from "@/components/seo/AppSeoSection";
import { MatScoreConverter } from "@/components/tools/matScoreConverter/MatScoreConverter";
import { MAT_SCORE_CONVERTER_FAQ_ITEMS } from "@/components/tools/matScoreConverter/MatScoreConverterFaq";
import { readEsatTableRows } from "@/lib/esat/serverTables";
import { MAT_SCORE_CONVERTER_PATH } from "@/lib/matScoreConverter";
import { seoLinks } from "@/lib/seo/links";
import {
  APP_ROUTES,
  breadcrumbSchema,
  buildSeoMetadata,
  faqPageSchema,
  webApplicationSchema,
} from "@/lib/seo/config";

const PATH = MAT_SCORE_CONVERTER_PATH;

const TITLE = "MAT Score Converter | Percentile & TMUA Equivalent";
const DESCRIPTION =
  "Enter your Oxford MAT past-paper score to compare it with historical applicants, shortlisted candidates and offer holders, and estimate a current TMUA percentile-equivalent.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "MAT score converter",
    "MAT score calculator",
    "MAT percentile",
    "MAT score distribution",
    "MAT to TMUA conversion",
    "MAT 2024 score",
    "MAT 2023 score",
    "Oxford MAT converter",
  ],
});

export default async function MatScoreConverterPage() {
  let tmuaRows: Awaited<ReturnType<typeof readEsatTableRows>> = [];
  try {
    tmuaRows = await readEsatTableRows("tmua_post_change_cumulative_2024_2025");
  } catch {
    tmuaRows = [];
  }

  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "MAT Score Converter",
            description: DESCRIPTION,
            path: PATH,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Score converter", path: APP_ROUTES.scoreConverter },
            { name: "MAT Score Converter", path: PATH },
          ]),
          faqPageSchema([...MAT_SCORE_CONVERTER_FAQ_ITEMS]),
        ]}
      />

      <MatScoreConverter tmuaRows={tmuaRows} />

      <Container size="lg" className="space-y-5 pb-16">
        <AppSeoSection
          heading="What to do after placing your MAT score"
          paragraphs={[
            "A historical MAT average comparison is useful only if it changes your practice. If you are below shortlisted or offer-holder averages for that year, spend the next sessions on the topics that cost marks, then sit another timed paper from the same MAT era.",
            "Oxford now uses TMUA for Mathematics and Computer Science. Use any TMUA percentile-equivalent to choose practice difficulty, not as a score Oxford will see from a past MAT paper.",
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
          links={seoLinks(
            "oxfordRequirements",
            "tmuaForEsat",
            "scoreConverter",
            "maths1",
          )}
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
