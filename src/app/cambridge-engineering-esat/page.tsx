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
  HighlightBox,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import { HomeInternationalChart } from "@/components/seo/HomeInternationalChart";
import {
  CAMBRIDGE_DASHBOARD_HREF,
  ENGINEERING_COLLEGE_COLUMNS,
  ENGINEERING_COLLEGE_ROWS,
  ENGINEERING_HOME_INTL_COLUMNS,
  ENGINEERING_HOME_INTL_ROWS,
  HISTORICAL_AVERAGE_NOTE,
} from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.cambridgeEngineering;

const TITLE = "Cambridge Engineering ESAT Requirements 2027";
const DESCRIPTION =
  "Cambridge Engineering ESAT modules for 2027, plus 2025 college and Home/international average scores. Historical averages, not cut-offs.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "Cambridge Engineering ESAT",
    "Cambridge Engineering ESAT score",
    "Cambridge Engineering college ESAT",
    "ESAT Engineering Cambridge",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "What modules does Cambridge Engineering require?",
    answer:
      "Mathematics 1, Mathematics 2 and Physics. Every Engineering applicant takes the same three modules.",
  },
  {
    question: "Does Cambridge have an ESAT cut-off for Engineering?",
    answer:
      "No published cut-off. The 2025 FOI averages describe one historical cohort. Admissions also use qualifications, references, context and interview performance.",
  },
  {
    question: "Does college choice affect the ESAT?",
    answer:
      "The test itself does not change by college. College averages differ because cohorts are small. Do not treat a college average as the score that college requires, and do not use the table to pick an 'easier' college.",
  },
  {
    question: "What did previous Cambridge Engineering offer holders score?",
    answer:
      "The 2025 FOI release lists college and Home/international averages for applicants and offer holders. Those numbers are historical averages, not requirements.",
  },
];

export default function CambridgeEngineeringEsatPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Cambridge Engineering"
      title="Cambridge Engineering ESAT Requirements 2027"
      intro={[
        "Cambridge Engineering is straightforward on the test side. Everyone takes Mathematics 1, Mathematics 2 and Physics.",
        "Cambridge lists A*A*A as the standard minimum offer level, with Mathematics and Physics required and Further Mathematics to AS or A level if your school offers it.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.maths1,
        label: "Maths 1 guide",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practise Maths 1, Maths 2 and Physics",
        body: "The Engineering combination is fixed. Use the score converter to interpret mocks, then practise the weakest of the three modules rather than chasing a college average.",
        primary: { href: APP_ROUTES.scoreConverter, label: "Open the score converter" },
        secondary: { href: SEO_ROUTES.physics, label: "Physics guide" },
      }}
      related={seoLinks(
        "cambridgeRequirements",
        "universityRequirements",
        "cambridgeNaturalSciences",
        "maths1",
        "maths2",
        "physics",
        "scoreConverter",
        "pastPapers",
      )}
      sources={[
        SOURCES.cambridgeEngineeringCourse,
        SOURCES.cambridgeAdmissionsStats,
        SOURCES.cambridgeEsat,
        SOURCES.esatTest,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Cambridge Engineering ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="2025 ESAT score data">
        <HighlightBox title="Important data note" tone="warning">
          <p>
            The detailed table below is 2025 Cambridge Engineering H100 data from
            a Freedom of Information release. These are averages, not cut-offs.
            Use them to understand the profile of one historical cohort, not to
            decide that a college is "easy" or "hard".
          </p>
        </HighlightBox>
        <SeoCtaRow className="mt-6">
          <SeoCta href={CAMBRIDGE_DASHBOARD_HREF} placement="engineering_dashboard">
            Explore Cambridge's official admissions data
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="2025 average ESAT scores by college">
        <ResponsiveTable
          columns={ENGINEERING_COLLEGE_COLUMNS}
          rows={ENGINEERING_COLLEGE_ROWS}
          minWidthClass="min-w-[56rem]"
          caption={HISTORICAL_AVERAGE_NOTE}
        />
      </SeoSection>

      <SeoSection heading="Home vs international averages">
        <HomeInternationalChart />
        <ResponsiveTable
          className="mt-8"
          columns={ENGINEERING_HOME_INTL_COLUMNS}
          rows={ENGINEERING_HOME_INTL_ROWS}
          minWidthClass="min-w-[52rem]"
          caption={HISTORICAL_AVERAGE_NOTE}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Do not say international applicants need 7.2. The data is an average from one historical Engineering cohort. It is useful as a realistic benchmark, especially for international applicants, but admissions also use qualifications, references, context and interview performance.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Where this data comes from">
        <SeoProse
          paragraphs={[
            "The primary source is Cambridge's official admissions statistics dashboard. The college and Home/international figures on this page come from a 2025 Cambridge FOI release for Engineering H100.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Official dashboard:{" "}
          <SeoTextLink href={CAMBRIDGE_DASHBOARD_HREF}>
            Cambridge application statistics
          </SeoTextLink>
          . Back to{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeRequirements}>
            Cambridge ESAT requirements
          </SeoTextLink>{" "}
          or the{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            university requirements hub
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
