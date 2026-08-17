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
  CAMBRIDGE_ACADEMIC_ROWS,
  CAMBRIDGE_DASHBOARD_HREF,
  CAMBRIDGE_MODULE_ROWS,
} from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.cambridgeRequirements;

const TITLE =
  "Cambridge ESAT Requirements 2027: Courses, Modules & Entry Requirements";
const DESCRIPTION =
  "Cambridge ESAT modules, October sitting rules and 2027 entry requirements for Engineering, Natural Sciences, Chemical Engineering and Veterinary Medicine.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "Cambridge ESAT",
    "Cambridge ESAT requirements",
    "Cambridge Engineering ESAT",
    "Cambridge Natural Sciences ESAT",
    "ESAT 2027 Cambridge",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "What modules does Cambridge Engineering require?",
    answer:
      "Mathematics 1, Mathematics 2 and Physics. There is no module choice on Engineering.",
  },
  {
    question: "What modules does Cambridge Natural Sciences require?",
    answer:
      "Mathematics 1, then any two of Biology, Chemistry, Physics and Mathematics 2. Cambridge says the choice is not uniquely advantageous for the Biological or Physical route.",
  },
  {
    question: "Does Cambridge have an ESAT cut-off?",
    answer:
      "Cambridge does not publish a pass mark or a college-specific ESAT requirement. Historical averages describe one cohort. They are not a cut-off.",
  },
  {
    question: "Does college choice affect the ESAT?",
    answer:
      "You sit the same modules for the course, whichever college you apply to. College-level averages can differ because cohorts are small and admissions are contextual. Do not treat a college average as the score that college requires.",
  },
  {
    question: "What did previous Cambridge Engineering offer holders score?",
    answer:
      "The 2025 Engineering FOI release gives college and Home/international averages. See the Cambridge Engineering page. Those figures are historical averages, not requirements.",
  },
];

export default function CambridgeEsatRequirementsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Cambridge"
      title="Cambridge ESAT Requirements 2027"
      intro={[
        "For 2027 entry, Cambridge requires the ESAT for Chemical Engineering and Biotechnology, Engineering, Natural Sciences and Veterinary Medicine.",
        "For the normal 15 October UCAS deadline, you must take the October ESAT sitting. Cambridge currently lists 12 to 16 October 2026 for the October sitting. Applicants from China, Hong Kong and Macau must take 12 or 13 October.",
      ]}
      lastChecked
      primaryCta={{
        href: SEO_ROUTES.cambridgeEngineering,
        label: "Engineering ESAT data",
      }}
      secondaryCta={{
        href: SEO_ROUTES.cambridgeNaturalSciences,
        label: "Natural Sciences ESAT",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Next: check modules, then practise them",
        body: "Engineering is fixed as Maths 1, Maths 2 and Physics. Natural Sciences lets you choose two modules after Maths 1. Then use past papers and calibration on those modules.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "View past papers" },
      }}
      related={seoLinks(
        "universityRequirements",
        "cambridgeEngineering",
        "cambridgeNaturalSciences",
        "testDates",
        "maths1",
        "maths2",
        "physics",
        "scoreConverter",
      )}
      sources={[
        SOURCES.cambridgeEsat,
        SOURCES.cambridgeAdmissionsStats,
        SOURCES.cambridgeEngineeringCourse,
        SOURCES.cambridgeNatSciCourse,
        SOURCES.esatTest,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Cambridge ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Required ESAT modules">
        <ResponsiveTable
          columns={["Course", "Required modules"]}
          rows={CAMBRIDGE_MODULE_ROWS}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More on{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering
          </SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeNaturalSciences}>
            Natural Sciences
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Published 2027 academic requirements">
        <ResponsiveTable
          columns={["Course", "Published 2027 requirement", "Key subjects"]}
          rows={CAMBRIDGE_ACADEMIC_ROWS}
          minWidthClass="min-w-[44rem]"
        />
      </SeoSection>

      <SeoSection heading="Cambridge admissions statistics">
        <SeoProse
          paragraphs={[
            "Cambridge's official dashboard can be filtered by course, College, domicile, qualifications and admissions-test scores. Use that dashboard for the latest view. Do not turn a published ratio into a personal acceptance probability.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta href={CAMBRIDGE_DASHBOARD_HREF} placement="cambridge_dashboard">
            Explore Cambridge's official admissions data
          </SeoCta>
        </SeoCtaRow>
        <HighlightBox className="mt-6" title="Useful 2025 course figures">
          <p>
            Natural Sciences: 5 applications per place, with 576 accepted on the
            current course page.
          </p>
          <p>
            Engineering: 2,654 applicants, 371 offers and 333 acceptances in the
            2025 cycle according to published admissions statistics.
          </p>
          <p>
            Natural Sciences: 2,644 applicants, 672 offers and 576 acceptances
            in 2025 according to current published admissions figures.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="How this sits next to other universities">
        <SeoProse
          paragraphs={[
            "If you are also applying to Oxford, Imperial or UCL, one ESAT sitting has to work for every course that accepts that sitting. Cambridge's October rule is usually the constraint.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Back to{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            all university requirements
          </SeoTextLink>
          , or compare{" "}
          <SeoTextLink href={SEO_ROUTES.oxfordRequirements}>Oxford</SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.imperialRequirements}>
            Imperial
          </SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={SEO_ROUTES.uclRequirements}>UCL</SeoTextLink>.
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
