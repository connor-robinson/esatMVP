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
  InfoCardGrid,
  NumberedSteps,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  COMPARISON_COLUMNS,
  COMPARISON_ROWS,
} from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.universityRequirements;

const TITLE =
  "ESAT University Requirements 2027: Cambridge, Oxford, Imperial & UCL";
const DESCRIPTION =
  "2027 ESAT modules and sittings for Cambridge, Oxford, Imperial and UCL, plus published admissions data where universities share it.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT university requirements",
    "ESAT Cambridge",
    "ESAT Oxford",
    "ESAT Imperial",
    "ESAT UCL",
    "ESAT modules 2027",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Which universities require ESAT in 2027?",
    answer:
      "Cambridge, Oxford, Imperial and UCL use ESAT for specific science and engineering courses. Always check the exact course page, because the modules and sitting can differ.",
  },
  {
    question: "Which ESAT modules do I need?",
    answer:
      "It depends on the university and course. Cambridge Engineering, Oxford Engineering, Oxford Physics and several Imperial engineering courses use Maths 1, Maths 2 and Physics. Natural Sciences, Veterinary Medicine and Oxford Biomedical Sciences use Maths 1 plus any two of Biology, Chemistry, Physics and Maths 2.",
  },
  {
    question: "Can I choose my ESAT modules?",
    answer:
      "Sometimes. Some courses fix all three modules. Others let you choose two after Maths 1. The choice is set by the course, not by preference after booking unless the university allows it.",
  },
  {
    question: "Can I use one ESAT result for Cambridge and Imperial?",
    answer:
      "You can only sit once in an admissions cycle. One sitting can cover the universities that accept that sitting. Cambridge normally needs the October sitting, so if Cambridge is in your list, plan for October.",
  },
  {
    question: "Is there an ESAT pass mark?",
    answer:
      "No published pass mark. Universities use module scores alongside qualifications, context and interviews. Historical averages are not cut-offs.",
  },
  {
    question: "Do international students need a higher ESAT score?",
    answer:
      "There is no published requirement that international applicants need a higher score. Cambridge's 2025 Engineering FOI data shows higher averages for international applicants and offer holders in that cohort, but that is a historical profile, not a threshold.",
  },
];

export default function EsatUniversityRequirementsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="University requirements"
      title="ESAT University Requirements 2027"
      intro={[
        "ESAT modules depend on the university and course, so check the exact course before you book. The 2027 requirements and any published score data are below. Historical averages are a benchmark, not a cut-off.",
      ]}
      lastChecked
      primaryCta={{
        href: SEO_ROUTES.cambridgeRequirements,
        label: "Cambridge requirements",
      }}
      secondaryCta={{
        href: SEO_ROUTES.oxfordRequirements,
        label: "Oxford requirements",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Modules checked. Now practise the right ones",
        body: "Once the sitting and modules are fixed, the useful question is what to practise. Calibration and the score converter help you set a target without treating historical averages as a cut-off.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.scoreConverter, label: "Open the score converter" },
      }}
      related={seoLinks(
        "cambridgeRequirements",
        "oxfordRequirements",
        "imperialRequirements",
        "uclRequirements",
        "preparation",
        "testDates",
        "scoreConverter",
        "maths1",
        "maths2",
        "physics",
      )}
      sources={[
        SOURCES.esatTest,
        SOURCES.cambridgeEsat,
        SOURCES.oxfordAdmissionsTests,
        SOURCES.imperialEsat,
        SOURCES.uclTests,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT University Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="Quick comparison"
        lead="Confirm the course page before you book. Sitting rules can be stricter than the table."
      >
        <ResponsiveTable
          columns={COMPARISON_COLUMNS}
          rows={COMPARISON_ROWS}
          minWidthClass="min-w-[48rem]"
          caption="2027 entry snapshot. Always confirm modules and sitting on the official course page."
        />
        <SeoCtaRow className="mt-6">
          <SeoCta href={SEO_ROUTES.cambridgeEngineering} variant="quiet">
            Cambridge Engineering data
          </SeoCta>
          <SeoCta href={SEO_ROUTES.cambridgeNaturalSciences} variant="quiet">
            Natural Sciences
          </SeoCta>
          <SeoCta href={SEO_ROUTES.imperialRequirements} variant="quiet">
            Imperial modules
          </SeoCta>
          <SeoCta href={SEO_ROUTES.uclRequirements} variant="quiet">
            UCL modules
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="University guides">
        <InfoCardGrid
          columns={2}
          cards={[
            {
              title: "Cambridge",
              body: "Engineering, Natural Sciences, Chemical Engineering and Biotechnology, and Veterinary Medicine. October sitting for the normal 15 October UCAS deadline.",
            },
            {
              title: "Oxford",
              body: "Engineering Science, Physics, Physics and Philosophy, and Biomedical Sciences. October sitting for standard undergraduate applicants.",
            },
            {
              title: "Imperial",
              body: "Course-dependent modules across engineering and science. Imperial also publishes historical 2025 ESAT score data by department.",
            },
            {
              title: "UCL",
              body: "Electronic and Electrical Engineering currently lists Maths 1 plus any two of Physics, Maths 2, Chemistry and Biology.",
            },
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full detail:{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeRequirements}>
            Cambridge ESAT requirements
          </SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.oxfordRequirements}>
            Oxford ESAT requirements
          </SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.imperialRequirements}>
            Imperial ESAT requirements
          </SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={SEO_ROUTES.uclRequirements}>
            UCL ESAT requirements
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="How to use historical ESAT scores">
        <HighlightBox title="Historical data tells you what happened, not what will happen to you.">
          <p>
            Offer-holder averages are a target-setting tool, not a prediction
            engine and not a published cut-off.
          </p>
        </HighlightBox>
        <NumberedSteps
          className="mt-6"
          steps={[
            "Look at the UAT-UK scale and median or percentile context.",
            "Look at course competition.",
            "Look at offer-holder averages where a university publishes them.",
            "Look at Home vs International separately where available.",
            "Look at each module, not only an average.",
            "Remember interviews and contextual information can change outcomes.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          For the 1.0 to 9.0 scale, see{" "}
          <SeoTextLink href={SEO_ROUTES.goodScore}>
            what is a good ESAT score
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={APP_ROUTES.scoreConverter}>
            score converter
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="ESAT for international applicants">
        <SeoProse
          paragraphs={[
            "International applicants should not simply use UK applicant averages as a target.",
            "Cambridge's 2025 Engineering data is unusually useful because it separates Home and International applicants and offer holders. Applicant pools differ, qualifications differ, context matters, and small cohorts can move averages.",
          ]}
        />
        <SeoList
          className="mt-5"
          items={[
            "Applicant pools differ.",
            "Qualifications differ.",
            "Context matters.",
            "College and course differences matter.",
            "Small cohorts can move averages.",
            "Historical data is not a threshold.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          See the Home and international table on{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering ESAT
          </SeoTextLink>
          . Oxford does not currently publish equivalent international ESAT
          averages.
        </p>
      </SeoSection>

      <SeoSection heading="What to practise after you know the modules">
        <SeoProse
          paragraphs={[
            "Once the modules are fixed, practise those papers rather than every ESAT subject. Maths 1 is almost always required. Maths 2 and Physics matter for most engineering routes. Biology and Chemistry matter when the course lets you choose them.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          <SeoTextLink href={SEO_ROUTES.maths1}>Maths 1</SeoTextLink>
          , <SeoTextLink href={SEO_ROUTES.maths2}>Maths 2</SeoTextLink>
          , <SeoTextLink href={SEO_ROUTES.physics}>Physics</SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>past papers</SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={SEO_ROUTES.testDates}>test dates</SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
