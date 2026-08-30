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
  InfoCardGrid,
  NumberedSteps,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
  TimelineSection,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.preparation;

const TITLE = "ESAT Preparation 2026/27 | Study Plan, Practice & Timing";
const DESCRIPTION =
  "Prepare for the ESAT with a clear plan for no-calculator speed, module practice, past papers, timing and mistake review. Start with a free calibration test.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT preparation",
    "how to prepare for ESAT",
    "ESAT revision",
    "ESAT practice",
    "ESAT study plan",
    "ESAT no calculator",
    "ESAT Maths 1",
    "ESAT Maths 2",
    "ESAT Physics",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT preparation just past papers?",
    answer:
      "No. Past papers are useful, but ESAT also rewards no-calculator fluency, timing, method selection and careful review. Use past papers after you know which skills need work.",
  },
  {
    question: "How early should I start preparing for ESAT?",
    answer:
      "Three to six months is comfortable. One to two months can work if practice is focused and consistent. If the test is close, prioritise calibration, weak skills and timed mixed sets.",
  },
  {
    question: "Should I do full mocks immediately?",
    answer:
      "Not usually. Full mocks are useful, but early preparation should often focus on weak skills and short timed sets. Save some full sittings for later so you can measure progress properly.",
  },
];

export default function EsatPreparationPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Preparation hub"
      title="ESAT Preparation Guide"
      intro={[
        "Preparing for the ESAT is not just about learning more content. You need to answer unfamiliar maths and science questions quickly, without a calculator, across separately timed modules.",
        "The best preparation plan is simple: check the specification, build no-calculator fluency, practise ESAT-style questions, and review mistakes by skill rather than by paper.",
      ]}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      secondaryCta={{
        href: APP_ROUTES.noCalcPractice,
        label: "Try no-calculator practice",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Find the part of ESAT prep you should fix first",
        body: "The fastest improvement usually comes from identifying the exact bottleneck: speed, accuracy, topic knowledge, or method selection. Start with calibration, then practise the skill that is actually costing marks.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "View the past-paper guide" },
      }}
      related={seoLinks(
        "maths1",
        "maths2",
        "physics",
        "pastPapers",
        "testDates",
        "universityRequirements",
        "calibration",
      )}
      sources={[SOURCES.esatTest, SOURCES.prepare, SOURCES.contentSpec]}
      schema={articleSchema({
        headline: "ESAT Preparation Guide",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What makes the ESAT different"
        lead="Five structural facts shape almost every sensible preparation decision."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            {
              title: "No calculator",
              body: "Arithmetic, fractions, ratios and formula rearrangement all have to be fast on paper.",
            },
            {
              title: "Tight timing",
              body: "Each module gives 40 minutes for 27 questions, roughly 90 seconds each.",
            },
            {
              title: "Mixed reasoning",
              body: "Many questions test school knowledge in less familiar contexts rather than new content.",
            },
            {
              title: "Separate modules",
              body: "Unused time in one module does not carry over to the next.",
            },
            {
              title: "No negative marking",
              body: "Unanswered questions are usually worse than intelligent guesses.",
            },
            {
              title: "Computer-based",
              body: "You work on screen with a whiteboard for rough working, not on the paper itself.",
            },
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More detail on each of these:{" "}
          <SeoTextLink href={SEO_ROUTES.calculatorRules}>
            calculator rules
          </SeoTextLink>
          , <SeoTextLink href={SEO_ROUTES.testDay}>test-day timing</SeoTextLink>,{" "}
          <SeoTextLink href={SEO_ROUTES.maths1}>Maths 1</SeoTextLink> and{" "}
          <SeoTextLink href={SEO_ROUTES.maths2}>Maths 2</SeoTextLink>.
        </p>
      </SeoSection>

      <SeoSection heading="The preparation order most students should follow">
        <NumberedSteps
          steps={[
            "Check your required modules on the course pages you are applying to.",
            "Read the relevant specification or ESAT guide.",
            "Take a calibration test.",
            "Train no-calculator speed daily in short sessions.",
            "Practise module-specific ESAT-style questions.",
            "Use ENGAA and NSAA papers selectively.",
            "Save full mocks for later.",
            "Review mistakes by skill: method, arithmetic, concept, timing.",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Past papers are useful, but they are not a complete plan. If a student keeps missing ratio questions because their fraction manipulation is slow, doing another full paper will not fix the cause quickly.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Preparation timeline">
        <TimelineSection
          items={[
            {
              when: "3–6 months out",
              what: "Build speed and identify weak topics. Short daily no-calculator work beats occasional long sessions.",
            },
            {
              when: "1–2 months out",
              what: "Timed mixed sets and past-paper sections, chosen by topic rather than by whole paper.",
            },
            {
              when: "Final 2 weeks",
              what: "Full sittings, mistake review and a pacing strategy you can actually follow under pressure.",
            },
            {
              when: "Final 3 days",
              what: "Light review, interface familiarity, sleep and test-centre logistics.",
            },
          ]}
        />
        <SeoCtaRow className="mt-7">
          <SeoCta href={APP_ROUTES.calibration} placement="timeline">
            Build my starting plan
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection
        heading="What to practise first"
        lead="Match the practice to the actual problem instead of working through everything evenly."
      >
        <ResponsiveTable
          columns={["If your problem is…", "Practise this first"]}
          rows={[
            ["Slow but accurate", "Short timed drills on fractions, ratio and algebra"],
            ["Fast but careless", "Accuracy drills, answer checking, a slower first pass"],
            [
              "Weak Physics",
              "Formula choice, units, proportional reasoning, graph interpretation",
            ],
            [
              "Weak Maths 2",
              "Algebraic manipulation, functions, logs, trig and calculus-style reasoning",
            ],
            ["No clear weakness", "Take calibration before choosing practice"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Past papers and official resources">
        <SeoProse
          paragraphs={[
            "Official UAT-UK materials should be the starting point. Historic ENGAA and NSAA papers are useful because they contain questions of the type found in ESAT, but they need filtering: some questions are outside the current ESAT specification, and some ENGAA and NSAA questions overlap with each other.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={SEO_ROUTES.pastPapers}
            variant="quiet"
            placement="past_papers"
          >
            View the past-paper guide
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection
        id="common-esat-mistakes"
        heading="Common ESAT mistakes"
        lead="These are the preparation habits we see most often in calibration results and review sessions. They are fixable once you know which one is yours."
      >
        <InfoCardGrid
          columns={2}
          cards={[
            {
              title: "Practising without diagnosing",
              body: "Calibration separates speed from accuracy and tags errors by type. Random practice hides whether the bottleneck is arithmetic, method choice or content.",
            },
            {
              title: "Ignoring calculation speed",
              body: "Slow fraction or ratio work costs time in Maths 1 and in science modules that depend on the same arithmetic mid-question.",
            },
            {
              title: "Reviewing only the final mark",
              body: "A wrong answer can come from a concept gap, wrong method, arithmetic slip or misread. Marking it wrong records none of that pattern.",
            },
            {
              title: "Skipping timed module practice",
              body: "Each module is 27 questions in 40 minutes, timed separately. Untimed sets never rehearse when to abandon a question and move on.",
            },
            {
              title: "Burning clean past papers too early",
              body: "Full mocks are useful later. Early ones often repeat what you already know and use up unseen material, including duplicate ENGAA and NSAA questions from the same year.",
            },
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Check duplicate ENGAA and NSAA questions before treating a second paper
          from the same year as fresh evidence:{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers for ESAT
          </SeoTextLink>
          .
        </p>
        <SeoCtaRow className="mt-6">
          <SeoCta href={APP_ROUTES.calibration} placement="common_mistakes">
            Find my weakest ESAT skill
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>
    </SeoPageLayout>
  );
}
