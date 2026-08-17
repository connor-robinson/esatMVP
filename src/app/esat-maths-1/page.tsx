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
  Expr,
  InfoCardGrid,
  MiniExample,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.maths1;

const TITLE = "ESAT Maths 1 Preparation | Syllabus, Topics & Practice";
const DESCRIPTION =
  "Prepare for ESAT Mathematics 1 with a focused guide to topics, timing, no-calculator skills, common mistakes and practice order.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT Maths 1",
    "ESAT Mathematics 1",
    "ESAT Maths 1 topics",
    "ESAT Maths 1 practice",
    "ESAT Maths 1 questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT Maths 1 easy?",
    answer:
      "The content is mostly core maths, but the timing and question style make it challenging. The test rewards fast, accurate method selection rather than new knowledge.",
  },
  {
    question: "What should I practise first for Maths 1?",
    answer:
      "Start with no-calculator arithmetic, fractions, ratios and algebraic manipulation. These skills appear inside many different question types, so improving them lifts your score across the module.",
  },
  {
    question: "Are NSAA papers useful for Maths 1?",
    answer:
      "Yes. NSAA Part A Mathematics is one of the most useful old-paper sources, but watch for overlap with ENGAA questions from the same year.",
  },
];

export default function EsatMaths1Page() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Module guide"
      title="ESAT Maths 1 Preparation"
      intro={[
        "Maths 1 is the compulsory ESAT module. It tests core mathematical fluency under pressure: number, ratio, algebra, geometry, probability, statistics and problem solving without a calculator.",
        "Many students know the content but lose marks because they are too slow, too careless, or unsure which method is quickest.",
      ]}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start Maths 1 calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.noCalcPractice,
        label: "Try no-calculator practice",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Work out which Maths 1 skill is costing you marks",
        body: "The calibration test is Maths 1 specific. It records how long each question takes as well as whether you got it right, so the result separates a speed problem from a knowledge problem.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.noCalcPractice, label: "Open the trainer" },
      }}
      related={seoLinks("noCalcPractice", "maths2", "pastPapers", "calibration")}
      sources={[SOURCES.contentSpec, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Maths 1 Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What Maths 1 tests"
        lead="All candidates take this module, and most courses require it plus two others."
      >
        <InfoCardGrid
          columns={4}
          cards={[
            { title: "Units and measures", body: "Conversion, compound units and sensible magnitudes." },
            { title: "Number and arithmetic", body: "Fractions, decimals, powers, roots and standard form." },
            { title: "Ratio and proportion", body: "Sharing, scaling, percentages and multipliers." },
            { title: "Algebra and formulae", body: "Manipulation, rearrangement, inequalities and solving." },
            { title: "Graphs and coordinates", body: "Straight lines, gradients, intercepts and curve shapes." },
            { title: "Geometry and trigonometry", body: "Angles, area, volume, similarity and basic trig." },
            { title: "Probability and statistics", body: "Combined events, averages and data interpretation." },
            { title: "Mixed problem solving", body: "Multi-step questions in unfamiliar contexts." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why Maths 1 catches strong students">
        <SeoProse
          paragraphs={[
            "Maths 1 can look familiar, but the timing changes the problem. A method that works in a school exam may be too slow when you have about 90 seconds per question and 27 questions to get through in 40 minutes.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Over-expanding expressions instead of spotting structure.",
            "Treating ratio questions like long algebra.",
            "Losing signs when multiplying or dividing inequalities.",
            "Making fraction mistakes under time pressure.",
            "Not estimating before calculating, so a wrong answer looks plausible.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="A worked example">
        <MiniExample
          question="A value increases by 20% and then decreases by 20%. What percentage of the original value remains?"
          solution={
            <>
              Multipliers are faster than repeated percentage arithmetic. The value
              becomes <Expr>1.2 × 0.8 = 0.96</Expr>, so 96% remains.
            </>
          }
          point="The content is simple. The skill is recognising the fastest method before you start writing."
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={APP_ROUTES.noCalcPractice}
            variant="quiet"
            placement="example"
          >
            Practise percentage multipliers
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="Recommended practice order">
        <ResponsiveTable
          columns={["Stage", "Focus"]}
          rows={[
            ["1", "Calibration: separate speed from accuracy"],
            ["2", "Number, fractions, percentages and ratios"],
            ["3", "Algebra and formula rearrangement"],
            ["4", "Geometry, graphs and data"],
            ["5", "Mixed timed sets at 40 minutes for 27 questions"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Old papers for Maths 1">
        <SeoProse
          paragraphs={[
            "For old-paper practice, start with NSAA Section 1 Part A Mathematics and ENGAA Section 1 Part A maths questions. Avoid double-counting questions that appear in both papers.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Which questions overlap and which to skip:{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers for ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
