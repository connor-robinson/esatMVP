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
import { SeoSection, SeoTextLink } from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.commonMistakes;

const TITLE = "Common ESAT Preparation Mistakes | What to Avoid";
const DESCRIPTION =
  "Avoid the most common ESAT preparation mistakes: random practice, poor timing, weak no-calculator skills, bad review habits and full mocks too early.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT common mistakes",
    "ESAT preparation mistakes",
    "ESAT revision mistakes",
    "ESAT timing mistakes",
  ],
});

type Mistake = {
  heading: string;
  problem: string;
  better: string;
  link?: { href: string; label: string };
};

const MISTAKES: readonly Mistake[] = [
  {
    heading: "Mistake 1: Only doing past papers",
    problem:
      "Past papers are important, but they are a diagnosis tool as much as a practice tool. If every paper shows the same ratio, algebra or unit-conversion mistakes, moving to the next paper does not fix the cause.",
    better: "Tag the mistake and practise that skill directly.",
    link: { href: SEO_ROUTES.pastPapers, label: "How to use past papers properly" },
  },
  {
    heading: "Mistake 2: Ignoring no-calculator speed",
    problem:
      "The ESAT is a no-calculator exam. If arithmetic or fraction manipulation is slow, it affects maths and science questions alike, and the loss is invisible on a mark scheme.",
    better: "Use short, timed no-calculator drills most days.",
    link: {
      href: SEO_ROUTES.noCalcPractice,
      label: "No-calculator practice guide",
    },
  },
  {
    heading: "Mistake 3: Reviewing only the final answer",
    problem:
      "A wrong answer can come from many causes: a concept gap, the wrong method, an arithmetic error, a misread question, or time pressure. Marking it wrong records none of that.",
    better: "Review by error type, so the pattern becomes visible after a week.",
  },
  {
    heading: "Mistake 4: Starting full mocks too early",
    problem:
      "Full mocks are useful, but early ones often tell you what you already know: that you are not ready yet. They also use up your limited supply of clean, unseen material.",
    better:
      "Calibrate, practise weak skills, then use full mocks to check whether the improvement transferred.",
    link: { href: APP_ROUTES.calibration, label: "Start with calibration" },
  },
  {
    heading: "Mistake 5: Not practising under module timing",
    problem:
      "Each ESAT module is 27 questions in 40 minutes, timed separately. Single-question practice never rehearses the decision of when to abandon a question and move on.",
    better:
      "Build up from 5-minute drills to 15-minute sets to full 40-minute module practice.",
    link: { href: SEO_ROUTES.testDay, label: "Pacing on test day" },
  },
  {
    heading: "Mistake 6: Treating Maths 1 as easy",
    problem:
      "Maths 1 is core maths, which makes it feel safe. Speed and accuracy are what make it dangerous, and it is compulsory for every candidate.",
    better: "Train the fundamentals until they are automatic rather than merely known.",
    link: { href: SEO_ROUTES.maths1, label: "ESAT Maths 1 guide" },
  },
  {
    heading: "Mistake 7: Leaving test-day details too late",
    problem:
      "Whiteboard working, no automatic breaks and on-screen navigation all affect performance. Discovering them in the test centre costs marks that have nothing to do with ability.",
    better:
      "Read the test-day rules and practise compact working well before the week of the exam.",
    link: { href: SEO_ROUTES.testDay, label: "What test day is like" },
  },
];

const FAQ: readonly FaqItem[] = [
  {
    question: "What is the biggest ESAT preparation mistake?",
    answer:
      "Practising without diagnosing. If you do not know whether your issue is speed, accuracy, content or method selection, your revision becomes inefficient.",
  },
  {
    question: "Are full mocks bad for ESAT preparation?",
    answer:
      "No. They are important later. The mistake is using full mocks as the only method of preparation, or spending your clean unseen papers before you can benefit from them.",
  },
];

export default function EsatCommonMistakesPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Preparation"
      title="Common ESAT Preparation Mistakes"
      intro={[
        "Most ESAT preparation mistakes are not dramatic. They are small habits repeated for weeks: practising randomly, ignoring speed, marking papers without analysing errors, and leaving full timing practice too late.",
      ]}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Find my weakest ESAT skill" }}
      secondaryCta={{ href: SEO_ROUTES.preparation, label: "Read the prep guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Diagnose before you practise",
        body: "Every mistake on this page has the same root: working hard without knowing which specific thing is costing marks. Twenty minutes of diagnosis usually saves several weeks of unfocused practice.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.preparation, label: "See the preparation order" },
      }}
      related={seoLinks("preparation", "noCalcPractice", "pastPapers", "calibration")}
      sources={[SOURCES.prepare, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "Common ESAT Preparation Mistakes",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      {MISTAKES.map((mistake) => (
        <SeoSection key={mistake.heading} heading={mistake.heading}>
          <p className="leading-relaxed text-[#94A3B8]">{mistake.problem}</p>
          <p className="mt-4 rounded-2xl bg-[#3B82F6]/10 p-4 leading-relaxed text-[#94A3B8]">
            <span className="font-bold text-[#93C5FD]">Better: </span>
            {mistake.better}
          </p>
          {mistake.link ? (
            <p className="mt-4 text-sm text-[#94A3B8]">
              <SeoTextLink href={mistake.link.href}>
                {mistake.link.label}
              </SeoTextLink>
            </p>
          ) : null}
        </SeoSection>
      ))}
    </SeoPageLayout>
  );
}
