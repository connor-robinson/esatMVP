import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import {
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  ENGINEERING_HOME_INTL_COLUMNS,
  ENGINEERING_HOME_INTL_ROWS,
  HISTORICAL_AVERAGE_NOTE,
  IMPERIAL_SCORE_DASHBOARD_HREF,
} from "@/lib/seo/universityRequirements";
import { Suspense } from "react";
import { PercentileExplorer } from "@/components/esat/PercentileExplorer";

const PATH = SEO_ROUTES.goodScore;

const TITLE =
  "What Is a Good ESAT Score? Score Guide, Percentiles & University Context";
const DESCRIPTION =
  "Find out what counts as a good ESAT score, how the 1.0 to 9.0 scale works, where 7.0 sits and what Cambridge, Oxford and Imperial publish about admissions.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "what is a good ESAT score",
    "ESAT score",
    "ESAT 7.0",
    "ESAT percentiles",
    "ESAT score converter",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is there an ESAT pass mark?",
    answer:
      "No. UAT-UK does not set a pass mark. Each module is reported from 1.0 to 9.0, and universities use the scores alongside the rest of the application.",
  },
  {
    question: "Is 7.0 a good ESAT score?",
    answer:
      "UAT-UK preparation material anchors 7.0 around the 90th percentile benchmark. That is very strong. It is still not a published university requirement.",
  },
  {
    question: "Do international applicants need a higher ESAT score?",
    answer:
      "There is no published rule that they do. Cambridge's 2025 Engineering FOI data shows higher offer-holder averages for international applicants in that cohort. Those figures are historical averages, not a threshold.",
  },
];

export default function GoodEsatScorePage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Scores"
      title="What Is a Good ESAT Score?"
      intro={[
        "There is no single ESAT score that guarantees an offer. Each module is scored from 1.0 to 9.0, with no pass mark. UAT-UK material anchors the scale around a median of 4.5 and a 90th percentile of 7.0.",
      ]}
      primaryCta={{ href: APP_ROUTES.scoreConverter, label: "Open the score converter" }}
      secondaryCta={{
        href: SEO_ROUTES.universityRequirements,
        label: "University requirements",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Aim to improve the weakest module, not hit a rumour",
        body: "A 7.0 benchmark is very strong, but there is no universal required score. Use the converter on mocks, then practise the module that is actually holding you down.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.preparation, label: "Preparation guide" },
      }}
      related={seoLinks(
        "scoreConverter",
        "universityRequirements",
        "preparation",
        "cambridgeEngineering",
        "oxfordRequirements",
        "imperialRequirements",
      )}
      sources={[
        SOURCES.results,
        SOURCES.prepare,
        SOURCES.oxfordPhysicsAdmissions,
        SOURCES.imperialEsatScores,
        SOURCES.cambridgeAdmissionsStats,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "What Is a Good ESAT Score?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <Suspense fallback={null}>
        <PercentileExplorer />
      </Suspense>

      <SeoSection heading="How to read the 1.0 to 9.0 scale">
        <ResponsiveTable
          columns={["Score", "Rough interpretation"]}
          rows={[
            ["1.0 to 3.9", "Below the yearly median"],
            ["4.0 to 4.4", "Around average"],
            ["4.5", "Approximate median"],
            ["5.0 to 5.9", "Above average"],
            ["6.0 to 6.9", "Strong"],
            ["7.0", "Around the published 90th percentile benchmark"],
            ["7.1 to 8.0", "Very strong"],
            ["8.0+", "Exceptional"],
          ]}
          caption="This is a guide to the score scale, not an admissions prediction."
        />
      </SeoSection>

      <SeoSection heading="Cambridge">
        <SeoProse
          paragraphs={[
            "Cambridge says there is no pass or fail ESAT and students should aim to do the best they can.",
            "The 2025 Engineering FOI release gives offer-holder averages for one historical cohort, not a required score.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={ENGINEERING_HOME_INTL_COLUMNS}
          rows={ENGINEERING_HOME_INTL_ROWS}
          minWidthClass="min-w-[52rem]"
          caption={`2025 Cambridge Engineering offer-holder and applicant averages. ${HISTORICAL_AVERAGE_NOTE}`}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full college table:{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Oxford">
        <SeoProse
          paragraphs={[
            "Oxford Physics says ESAT is the primary shortlisting criterion, interpreted in light of contextual data. The department says applicants per place have typically reached 8 to 10 and around 2.5 candidates per place are interviewed.",
            "Oxford Engineering Science says there is no single ESAT mark guaranteeing shortlisting.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More on{" "}
          <SeoTextLink href={SEO_ROUTES.oxfordRequirements}>
            Oxford ESAT requirements
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Imperial">
        <SeoProse
          paragraphs={[
            "Imperial publishes anonymous historical 2025-entry ESAT data by department, domicile and application outcome. Imperial calls this historical data and warns that distributions and outcomes vary by year.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta href={IMPERIAL_SCORE_DASHBOARD_HREF} placement="good_score_imperial">
            Open Imperial's official ESAT score dashboard
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="Practical target advice">
        <SeoProse
          paragraphs={[
            "If you are preparing, I would rather aim to maximise every module than study only until a minimum target is reached. A 7.0 benchmark is very strong, but there is no universal required score.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Use the{" "}
          <SeoTextLink href={APP_ROUTES.scoreConverter}>
            score converter
          </SeoTextLink>{" "}
          on mocks, then follow the{" "}
          <SeoTextLink href={SEO_ROUTES.preparation}>
            preparation guide
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
