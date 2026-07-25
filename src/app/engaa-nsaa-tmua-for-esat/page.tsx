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
  InfoCardGrid,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoSubheading,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.oldPapers;

const TITLE = "ENGAA, NSAA and TMUA for ESAT | What to Use and What to Skip";
const DESCRIPTION =
  "A practical guide to using ENGAA, NSAA and TMUA papers for ESAT Maths 1, Maths 2 and Physics preparation without wasting time on duplicates.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ENGAA NSAA TMUA for ESAT",
    "ENGAA for ESAT",
    "NSAA for ESAT",
    "TMUA for ESAT Maths 2",
    "ENGAA NSAA overlap",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is TMUA harder than ESAT Maths 2?",
    answer:
      "It is not a direct comparison. TMUA Paper 1 can be very useful for Maths 2-style problem solving, but it has a different format and timing.",
  },
  {
    question: "Should I use old Section 2 papers?",
    answer:
      "Use them selectively. Some advanced questions are good stretch practice, but many do not map cleanly to the current ESAT specification.",
  },
  {
    question: "What is the biggest mistake with ENGAA and NSAA papers?",
    answer:
      "Treating repeated questions as fresh evidence. If a question appears in both papers, count it once.",
  },
];

export default function OldPapersForEsatPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Old-paper mapping"
      title="ENGAA, NSAA and TMUA for ESAT"
      intro={[
        "Old admissions-test papers are useful for ESAT prep, but they are not interchangeable. NSAA is strongest for core maths and sciences. ENGAA is strong for maths, physics and advanced problem solving. TMUA is useful mainly for Maths 2 enrichment.",
        "The aim is not to do every paper. The aim is to choose the questions that match your ESAT modules and avoid solving the same question twice.",
      ]}
      lastChecked={{
        detail:
          "Question numbering and out-of-spec markings come from the official PDFs linked below, which UAT-UK updates periodically.",
      }}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{ href: SEO_ROUTES.pastPapers, label: "Past-paper guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Start with calibration while we build the full paper map",
        body: "Choosing between old papers is easier once you know which module and which skill is costing you the most. The diagnostic takes about twenty minutes and points at one thing to fix first.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "Read the past-paper guide" },
      }}
      related={seoLinks("pastPapers", "maths1", "maths2", "physics")}
      sources={[
        SOURCES.esatPrepMaterials,
        SOURCES.engaa2023,
        SOURCES.nsaa2023,
        SOURCES.tmuaTest,
        SOURCES.tmuaPrepMaterials,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ENGAA, NSAA and TMUA for ESAT",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="Quick recommendation by module"
        lead="If you only read one section, read this one."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            {
              title: "Maths 1",
              body: "Start with NSAA Part A Mathematics and ENGAA Part A maths questions. Focus on number, algebra, ratio, geometry, probability, statistics and timing.",
            },
            {
              title: "Physics",
              body: "Use NSAA Physics and ENGAA Part A physics questions. Focus on formula choice, graph interpretation, units and proportional reasoning.",
            },
            {
              title: "Maths 2",
              body: "Use selected ENGAA advanced maths and selected TMUA Paper 1. Focus on algebra, functions, coordinate geometry, trigonometry, sequences, logs and calculus-style reasoning.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection heading="What overlaps?">
        <SeoProse
          paragraphs={[
            "In the same year, many NSAA Mathematics and Physics questions also appear in the ENGAA paper. Do not treat both as separate full mocks. If you solve a question in one paper, mark its duplicate in the other as already seen.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={[
            "Example overlap",
            "ENGAA location",
            "NSAA location",
            "What this means",
          ]}
          rows={[
            [
              "Sphere / cylinder surface area, 2023",
              "ENGAA 2023 Section 1 Q1",
              "NSAA 2023 Part A Q1",
              "Count it once.",
            ],
            [
              "Spaceship stopping distance, 2023",
              "ENGAA 2023 Section 1 Q2",
              "NSAA 2023 Physics Q22",
              "Count it once.",
            ],
            [
              "Identical resistors circuit, 2023",
              "ENGAA 2023 Section 1 Q4",
              "NSAA 2023 Physics Q24",
              "Count it once.",
            ],
          ]}
        />
        <HighlightBox
          className="mt-5"
          tone="warning"
          title="This table is illustrative, not a complete overlap map"
        >
          <p>
            These are worked examples of the pattern, taken from the 2023 papers.
            They are not the full list. A complete duplicate map only makes sense
            once every downloaded official PDF has been checked question by
            question, which is work in progress.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="Recommended use by phase">
        <ResponsiveTable
          columns={["Phase", "Resource choice", "Main goal"]}
          rows={[
            [
              "Week 1",
              "Calibration plus easier NSAA/ENGAA topic questions",
              "Find weaknesses",
            ],
            ["Weeks 2–4", "Topic-filtered NSAA and ENGAA", "Repair weak skills"],
            [
              "Weeks 5–8",
              "Mixed timed 27-question sets",
              "Transfer skills into exam timing",
            ],
            [
              "Final weeks",
              "Official practice or specimen material plus clean unseen sets",
              "Simulate pressure",
            ],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Where TMUA fits">
        <SeoProse
          paragraphs={[
            "TMUA is not an ESAT paper. It lasts 2 hours 30 minutes across two papers of 20 multiple-choice questions in 75 minutes each, so it is slower per question and more abstract. Paper 2 includes logic and proof reasoning that is not a direct ESAT substitute.",
            "Paper 1 is still useful for students taking Maths 2, because it trains unfamiliar mathematical problem solving without a calculator — which is exactly the pressure Maths 2 applies.",
          ]}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <SeoSubheading>Use TMUA when</SeoSubheading>
            <SeoList
              className="mt-4"
              items={[
                "Your Maths 1 basics are already secure.",
                "You want harder algebraic problem solving.",
                "You need more high-quality unseen questions.",
              ]}
            />
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <SeoSubheading>Be careful because</SeoSubheading>
            <SeoList
              className="mt-4"
              items={[
                "Paper 1 maps onto ESAT better than Paper 2.",
                "Paper 2 logic and proof material is not an ESAT substitute.",
                "TMUA timing differs, so the score is not an ESAT prediction.",
              ]}
            />
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More on how this feeds into the module itself:{" "}
          <SeoTextLink href={SEO_ROUTES.maths2}>ESAT Maths 2 preparation</SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection
        heading="What a finished paper map needs to record"
        lead="This is the schema we are working towards, published here so you can see what is and is not available yet."
      >
        <SeoList
          items={[
            "Question source, year and paper.",
            "Section and part.",
            "ESAT module tag.",
            "Primary and secondary topic tags.",
            "Estimated difficulty.",
            "Out-of-spec flag.",
            "Duplicate group ID, so overlapping questions collapse into one.",
            "Recommended order and timing target.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
