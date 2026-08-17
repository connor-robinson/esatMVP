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
import {
  IMPERIAL_COURSE_ROWS,
  IMPERIAL_SCORE_DASHBOARD_HREF,
} from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.imperialRequirements;

const TITLE =
  "Imperial ESAT Requirements 2027: Courses, Modules & Entry Requirements";
const DESCRIPTION =
  "Imperial ESAT 2027 modules by course, plus a link to Imperial's official historical 2025 ESAT score dashboard.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "Imperial ESAT",
    "Imperial ESAT requirements",
    "Imperial Engineering ESAT",
    "Imperial ESAT modules",
    "ESAT Imperial 2027",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Which courses require ESAT?",
    answer:
      "Imperial lists ESAT for a set of undergraduate engineering and science courses, including Aeronautics, Chemical Engineering, Civil and Environmental Engineering, Design Engineering, Electrical and Electronic Engineering, Life Sciences, Mechanical Engineering and Physics. Confirm the current course page before you book.",
  },
  {
    question: "Which ESAT modules does Imperial Engineering require?",
    answer:
      "Most engineering courses use Maths 1, Maths 2 and Physics. Chemical Engineering uses Maths 1, Maths 2 and Chemistry. Design Engineering uses Maths 1 and Maths 2 only.",
  },
  {
    question: "Where is Imperial's historical ESAT score data?",
    answer:
      "Imperial publishes anonymous 2025-entry ESAT data by department, domicile and application outcome. Imperial calls this historical data and warns that distributions and outcomes vary by year. It is not a current admissions requirement.",
  },
];

export default function ImperialEsatRequirementsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Imperial"
      title="Imperial ESAT Requirements 2027"
      intro={[
        "Imperial's ESAT modules are course dependent. Check the exact course before you book, because Chemistry or Biology can replace Physics on some routes, and Design Engineering does not use a third science module.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.universityRequirements,
        label: "All university requirements",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Confirm the third module, then practise it",
        body: "Maths 1 and Maths 2 cover most Imperial engineering courses. The third module is where people book the wrong paper. Then use past papers and the score converter as estimates only.",
        primary: { href: SEO_ROUTES.maths2, label: "Maths 2 guide" },
        secondary: { href: APP_ROUTES.scoreConverter, label: "Score converter" },
      }}
      related={seoLinks(
        "universityRequirements",
        "cambridgeRequirements",
        "oxfordRequirements",
        "uclRequirements",
        "maths1",
        "maths2",
        "physics",
        "pastPapers",
      )}
      sources={[SOURCES.imperialEsat, SOURCES.imperialEsatScores, SOURCES.esatTest]}
      showDisclaimer
      schema={articleSchema({
        headline: "Imperial ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="ESAT modules by course">
        <ResponsiveTable
          columns={["Course", "ESAT modules"]}
          rows={IMPERIAL_COURSE_ROWS}
        />
      </SeoSection>

      <SeoSection heading="Historical 2025 ESAT score data">
        <HighlightBox title="Historical data, not a current requirement">
          <p>
            Imperial publishes anonymous 2025-entry ESAT data by department,
            domicile and application outcome. Imperial calls this historical
            data and warns that distributions and outcomes vary by year. This
            page does not copy dashboard numbers into static prose.
          </p>
        </HighlightBox>
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={IMPERIAL_SCORE_DASHBOARD_HREF}
            placement="imperial_dashboard"
          >
            Open Imperial's official 2025 ESAT score dashboard
          </SeoCta>
        </SeoCtaRow>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Use the dashboard to see how scores sat next to outcomes in that cycle. Do not treat a department average as the score Imperial will require this year.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="How this compares with Cambridge and Oxford">
        <SeoProse
          paragraphs={[
            "Several Imperial engineering courses use the same Maths 1, Maths 2 and Physics combination as Cambridge Engineering and Oxford Engineering Science. If Cambridge is also on your list, the October sitting is usually the one that works for everyone.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          See{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering
          </SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.oxfordRequirements}>
            Oxford requirements
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            university hub
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
