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
import {
  HighlightBox,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.uclRequirements;

const TITLE =
  "UCL ESAT Requirements 2027: Courses, Modules & Entry Requirements";
const DESCRIPTION =
  "UCL ESAT 2027 for Electronic and Electrical Engineering: Maths 1 plus any two of Physics, Maths 2, Chemistry and Biology, with October or January where permitted.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "UCL ESAT",
    "UCL ESAT requirements",
    "UCL Electronic Electrical Engineering ESAT",
    "ESAT UCL 2027",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Which UCL courses require ESAT?",
    answer:
      "UCL currently lists ESAT for Electronic and Electrical Engineering. Confirm the course page before you book, because UCL can add or change tests.",
  },
  {
    question: "Which ESAT modules does UCL EEE require?",
    answer:
      "Mathematics 1, plus any two of Physics, Mathematics 2, Chemistry and Biology.",
  },
  {
    question: "Can UCL applicants sit ESAT in January?",
    answer:
      "UCL can permit October or January where the course allows it. If you are also applying to Cambridge or Oxford, those universities normally need the October sitting.",
  },
];

export default function UclEsatRequirementsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="UCL"
      title="UCL ESAT Requirements 2027"
      intro={[
        "UCL currently uses ESAT for Electronic and Electrical Engineering. The modules are Mathematics 1 plus any two of Physics, Mathematics 2, Chemistry and Biology.",
        "UCL can allow the October or January sitting where the course permits it. If Cambridge or Oxford is also on your list, plan for October.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.universityRequirements,
        label: "All university requirements",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Pick the two optional modules you already study",
        body: "Maths 1 is fixed. The other two should match your A levels or equivalent. Then practise those papers rather than every ESAT subject.",
        primary: { href: SEO_ROUTES.maths1, label: "Maths 1 guide" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "Past papers" },
      }}
      related={seoLinks(
        "universityRequirements",
        "imperialRequirements",
        "cambridgeRequirements",
        "oxfordRequirements",
        "maths1",
        "maths2",
        "physics",
        "testDates",
      )}
      sources={[SOURCES.uclTests, SOURCES.esatTest, SOURCES.deadlines]}
      showDisclaimer
      schema={articleSchema({
        headline: "UCL ESAT Requirements 2027",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Required ESAT modules">
        <ResponsiveTable
          columns={["Course", "ESAT modules", "Normal 2027 sitting"]}
          rows={[
            [
              "Electronic & Electrical Engineering",
              "Maths 1 + any 2 of Physics, Maths 2, Chemistry, Biology",
              "October or January where permitted",
            ],
          ]}
          minWidthClass="min-w-[40rem]"
        />
        <HighlightBox className="mt-6" title="Check the course page">
          <p>
            UCL's test list can change. Confirm Electronic and Electrical
            Engineering, and any other course you are considering, on UCL's
            official tests page before you book.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="How this compares with Imperial and Cambridge">
        <SeoProse
          paragraphs={[
            "Imperial Electrical and Electronic Engineering uses Maths 1, Maths 2 and Physics, with no choice on the third module. UCL lets you choose two modules after Maths 1. Cambridge Engineering fixes Maths 1, Maths 2 and Physics and needs the October sitting.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Compare{" "}
          <SeoTextLink href={SEO_ROUTES.imperialRequirements}>
            Imperial requirements
          </SeoTextLink>
          ,{" "}
          <SeoTextLink href={SEO_ROUTES.cambridgeEngineering}>
            Cambridge Engineering
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
