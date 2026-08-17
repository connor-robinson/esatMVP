import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  buildSeoMetadata,
  webApplicationSchema,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import {
  InfoCardGrid,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.noCalcPractice;

const TITLE = "ESAT No-Calculator Practice | Speed & Accuracy Training";
const DESCRIPTION =
  "Improve ESAT no-calculator speed with targeted practice for fractions, ratios, algebra, estimation, units and formula rearrangement.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT no-calculator practice",
    "ESAT mental maths",
    "ESAT calculator rules",
    "no calculator admissions test",
    "ESAT speed practice",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "How long should a no-calculator session be?",
    answer:
      "Ten minutes done most days beats an hour done once a week. The skills you are training are recall and pattern recognition, which respond to frequency rather than session length.",
  },
  {
    question: "Does no-calculator practice only help Maths 1?",
    answer:
      "No. It also affects Physics, Chemistry and Biology questions, because those involve ratios, units, powers and graph gradients that all rely on the same underlying arithmetic.",
  },
  {
    question: "Is this practice free?",
    answer:
      "The addition module of the mental maths trainer and the calibration test are free to use. Full access to every module and the question bank is part of a paid plan.",
  },
];

export default function EsatNoCalculatorPracticePage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Practice"
      title="ESAT No-Calculator Practice"
      intro={[
        "The ESAT does not allow calculators, so calculation fluency is part of the exam. You need to manipulate numbers, fractions, ratios and formulae quickly enough that the maths does not get in the way of the reasoning.",
      ]}
      primaryCta={{
        href: APP_ROUTES.noCalcPractice,
        label: "Start no-calculator practice",
      }}
      secondaryCta={{ href: APP_ROUTES.calibration, label: "Take the diagnostic first" }}
      faq={FAQ}
      finalCta={{
        heading: "Start with a diagnostic, then train the weakest skill",
        body: "Practising every calculation skill evenly is slower than fixing the one that is actually costing marks. Take the short diagnostic, then spend your ten minutes a day on whatever it flags.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.noCalcPractice, label: "Open the trainer" },
      }}
      related={seoLinks("calculatorRules", "maths1", "physics", "calibration", "fermiGame")}
      sources={[SOURCES.esatTest, SOURCES.candidateHandbook]}
      schema={webApplicationSchema({
        name: "ESAT no-calculator trainer",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="Skills trained"
        lead="Each of these appears inside many different ESAT question types, which is why they are worth isolating."
      >
        <SeoList
          items={[
            "Fractions and mixed numbers.",
            "Percentages and multipliers.",
            "Ratio and proportion.",
            "Powers, roots and standard form.",
            "Formula rearrangement.",
            "Unit conversion.",
            "Estimation and answer checking.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why this matters for the science modules">
        <SeoProse
          paragraphs={[
            "No-calculator weakness does not only affect Maths 1. It also slows Physics, Chemistry and Biology questions whenever ratios, units, powers or graph gradients are involved.",
            "That is why a student can revise Physics content thoroughly and still run out of time: the physics was fine, the arithmetic in the middle of it was not.",
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="Speed versus accuracy"
        lead="The goal is not to rush. It is to make routine manipulation automatic, so more attention is available for the actual problem."
      >
        <InfoCardGrid
          cards={[
            {
              title: "Slow but accurate",
              body: "Timed fluency drills. The method is right; it needs to become quicker through repetition.",
            },
            {
              title: "Fast but inaccurate",
              body: "Accuracy and checking practice. Deliberately slow the first pass and verify before moving on.",
            },
            {
              title: "Slow and inaccurate",
              body: "Concept repair first. Speed work on a shaky method just makes the mistakes arrive faster.",
            },
            {
              title: "Inconsistent",
              body: "Mixed recall sets, so you cannot settle into one question type and coast.",
            },
          ]}
        />
      </SeoSection>

      <SeoSection heading="How this fits the rest of your preparation">
        <SeoProse
          paragraphs={[
            "No-calculator work is the foundation layer, not the whole plan. Once the arithmetic is reliable, the limiting factor usually becomes method selection and topic knowledge, which need module-specific practice instead.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          See the full sequence in the{" "}
          <SeoTextLink href={SEO_ROUTES.preparation}>
            ESAT preparation guide
          </SeoTextLink>
          , or the rules themselves in{" "}
          <SeoTextLink href={SEO_ROUTES.calculatorRules}>
            are calculators allowed in ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
