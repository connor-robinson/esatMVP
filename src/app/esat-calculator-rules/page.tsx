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
  Expr,
  InfoCardGrid,
  NumberedSteps,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.calculatorRules;

const TITLE = "ESAT Calculator Rules 2026/27 | No Calculators Allowed";
const DESCRIPTION =
  "Calculators are not allowed in ESAT. Learn what that means for preparation and how to practise no-calculator speed for maths and science questions.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "are calculators allowed in ESAT",
    "ESAT calculator",
    "ESAT no calculator",
    "ESAT mental maths",
    "ESAT rough working",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Can I bring my own paper into the ESAT?",
    answer:
      "No. UAT-UK says candidates are provided with an erasable whiteboard or laminated sheet and a marker pen. Personal pen and paper are not allowed in the test room.",
  },
  {
    question: "Should I practise mental maths separately?",
    answer:
      "Yes, but it should connect to ESAT-style questions. Pure mental maths helps most when it transfers into ratios, formulae, graphs and science problems.",
  },
];

export default function EsatCalculatorRulesPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test rules"
      title="Are Calculators Allowed in ESAT?"
      intro={[
        "No. Calculators are not permitted in the ESAT. That makes no-calculator fluency a core part of preparation, not a side skill.",
      ]}
      lastChecked={{
        detail:
          "Rules on permitted materials come from the UAT-UK candidate handbook linked below. Confirm the current version before your sitting.",
      }}
      primaryCta={{
        href: APP_ROUTES.noCalcPractice,
        label: "Try no-calculator practice",
      }}
      secondaryCta={{ href: SEO_ROUTES.testDay, label: "What test day is like" }}
      faq={FAQ}
      finalCta={{
        heading: "Make the arithmetic automatic",
        body: "The goal is not to become a human calculator. It is to make routine manipulation cheap enough that your attention stays on the actual problem. Short, frequent drills do that better than long sessions.",
        primary: { href: APP_ROUTES.noCalcPractice, label: "Start no-calculator practice" },
        secondary: { href: APP_ROUTES.calibration, label: "Diagnose with calibration" },
      }}
      related={seoLinks("noCalcPractice", "testDay", "calibration", "physics")}
      sources={[SOURCES.esatTest, SOURCES.candidateHandbook]}
      showDisclaimer
      schema={articleSchema({
        headline: "Are Calculators Allowed in ESAT?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="What you can use for working">
        <SeoProse
          paragraphs={[
            "At the test centre, candidates are given an erasable whiteboard or laminated sheet and a marker pen. Personal paper is not allowed. If the board or pen is not working properly, raise your hand and ask the invigilator to replace it.",
            "The ESAT is computer-based, so the whiteboard is only for rough working. Answers are entered on screen.",
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="The skills this changes"
        lead="Without a calculator, these stop being background admin and become scoring skills."
      >
        <InfoCardGrid
          columns={4}
          cards={[
            { title: "Fraction simplification", body: "Cancelling early instead of computing decimals." },
            { title: "Ratio manipulation", body: "Scaling and sharing without setting up long algebra." },
            { title: "Percentage multipliers", body: "Chaining changes in one step." },
            { title: "Estimation", body: "Knowing roughly what the answer should be." },
            { title: "Powers and roots", body: "Recognising squares, cubes and surd forms on sight." },
            { title: "Rearranging formulae", body: "Getting to the required variable in one pass." },
            { title: "Unit conversion", body: "Converting before the arithmetic, not after." },
            { title: "Checking answer size", body: "Catching an order-of-magnitude slip immediately." },
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="Three shortcuts worth automating"
        lead="Each of these saves 30 seconds or more on a question that looks like arithmetic but is really method choice."
      >
        <ul className="space-y-4">
          <li className="rounded-2xl bg-white/[0.04] p-5">
            <p className="leading-relaxed text-[#94A3B8]">
              <Expr>48 × 25 = 48 × 100 ÷ 4 = 1200</Expr>. Multiply by 100 and
              divide by 4 rather than doing long multiplication.
            </p>
          </li>
          <li className="rounded-2xl bg-white/[0.04] p-5">
            <p className="leading-relaxed text-[#94A3B8]">
              A 20% increase followed by a 20% decrease gives{" "}
              <Expr>1.2 × 0.8 = 0.96</Expr>, not 100%.
            </p>
          </li>
          <li className="rounded-2xl bg-white/[0.04] p-5">
            <p className="leading-relaxed text-[#94A3B8]">
              Doubling voltage at constant resistance quadruples power, because{" "}
              <Expr>P ∝ V²</Expr>. No numbers required.
            </p>
          </li>
        </ul>
      </SeoSection>

      <SeoSection heading="How to practise">
        <SeoProse
          paragraphs={[
            "Do short sessions often. Ten minutes of targeted no-calculator practice is usually more useful than one long session of random questions.",
          ]}
        />
        <NumberedSteps
          className="mt-6"
          steps={[
            "Do a short timed set.",
            "Mark mistakes by type, not just right or wrong.",
            "Repeat the weak skill on its own.",
            "Move back to mixed ESAT-style questions to check it transferred.",
          ]}
        />
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          The{" "}
          <SeoTextLink href={SEO_ROUTES.noCalcPractice}>
            no-calculator practice guide
          </SeoTextLink>{" "}
          covers which skills to train in which order.
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
