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
import { CAMBRIDGE_DASHBOARD_HREF } from "@/lib/seo/universityRequirements";

const PATH = SEO_ROUTES.cambridgeNaturalSciences;

const TITLE = "Cambridge Natural Sciences ESAT Requirements 2027";
const DESCRIPTION =
  "Cambridge Natural Sciences ESAT 2027: Maths 1 plus any two of Biology, Chemistry, Physics and Maths 2, with published competition figures.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "Cambridge Natural Sciences ESAT",
    "Natural Sciences ESAT modules",
    "Cambridge NatSci ESAT",
    "ESAT Biology Chemistry Physics",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "What modules does Cambridge Natural Sciences require?",
    answer:
      "Mathematics 1, then any two of Biology, Chemistry, Physics and Mathematics 2. The same rule applies whether you are aiming at the Biological or Physical route.",
  },
  {
    question: "Does the Biological or Physical route change the ESAT?",
    answer:
      "Cambridge says the choice of modules is not uniquely advantageous for either route. Select the modules that best match your current studies.",
  },
  {
    question: "Does Cambridge publish a Natural Sciences college ESAT table?",
    answer:
      "This page does not invent one. Use Cambridge's official admissions dashboard and filter by course if you want the latest published view.",
  },
];

export default function CambridgeNaturalSciencesEsatPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Cambridge Natural Sciences"
      title="Cambridge Natural Sciences ESAT Requirements 2027"
      intro={[
        "Natural Sciences requires Mathematics 1 and then any two of Biology, Chemistry, Physics and Mathematics 2.",
        "The Natural Sciences Tripos says the choice of modules is not uniquely advantageous for the Biological or Physical route. Select the modules that best match your current studies.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{ href: SEO_ROUTES.maths1, label: "Maths 1 guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Choose the two modules you already study well",
        body: "Maths 1 is fixed. The other two should match your A levels or equivalent, then you can practise those papers rather than all five ESAT subjects.",
        primary: { href: SEO_ROUTES.pastPapers, label: "View past papers" },
        secondary: { href: SEO_ROUTES.physics, label: "Physics guide" },
      }}
      related={seoLinks(
        "cambridgeRequirements",
        "universityRequirements",
        "cambridgeEngineering",
        "maths1",
        "maths2",
        "physics",
        "pastPapers",
        "scoreConverter",
      )}
      sources={[
        SOURCES.cambridgeNatSciTripos,
        SOURCES.cambridgeNatSciCourse,
        SOURCES.cambridgeAdmissionsStats,
        SOURCES.cambridgeEsat,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Cambridge Natural Sciences ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Module choice">
        <ResponsiveTable
          columns={["Route", "Compulsory", "Choose 2 from"]}
          rows={[
            [
              "Natural Sciences Biological",
              "Mathematics 1",
              "Biology, Chemistry, Physics, Mathematics 2",
            ],
            [
              "Natural Sciences Physical",
              "Mathematics 1",
              "Biology, Chemistry, Physics, Mathematics 2",
            ],
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Academic requirement: A*A*A, including Mathematics plus two other science or mathematics subjects.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Course-level competition">
        <SeoProse
          paragraphs={[
            "Cambridge's current Natural Sciences course page lists 5 applications per place and 576 accepted in the 2025 cycle. That is a course-level figure, not a personal probability.",
          ]}
        />
        <HighlightBox className="mt-5" title="No invented college ESAT table">
          <p>
            This page does not invent a Natural Sciences college ESAT score
            table. Use Cambridge's official dashboard and filter it by course
            if you want the latest published view.
          </p>
        </HighlightBox>
        <SeoCtaRow className="mt-6">
          <SeoCta href={CAMBRIDGE_DASHBOARD_HREF} placement="natsci_dashboard">
            Explore Cambridge's official admissions data
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="How to choose the two optional modules">
        <SeoProse
          paragraphs={[
            "Pick the two subjects you can already do quickly without a calculator. Physics and Maths 2 are a common Physical Sciences pairing. Biology and Chemistry are a common Biological pairing. Mixed pairings are allowed if they match what you actually study.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Practise with{" "}
          <SeoTextLink href={SEO_ROUTES.maths1}>Maths 1</SeoTextLink>,{" "}
          <SeoTextLink href={SEO_ROUTES.maths2}>Maths 2</SeoTextLink>,{" "}
          <SeoTextLink href={SEO_ROUTES.physics}>Physics</SeoTextLink> and{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>past papers</SeoTextLink>
          . Back to{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeRequirements}>
            Cambridge requirements
          </SeoTextLink>{" "}
          or the{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            university hub
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
