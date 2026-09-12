import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
  questionBankSubjectHref,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import {
  InfoCardGrid,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.questionBank;

const TITLE = "ESAT Question Bank | Topic Practice for Every Module";
const DESCRIPTION =
  "Practice ESAT questions by topic across Math 1, Math 2, Physics, Chemistry and Biology. 10 free questions per subject, with unlimited access for full practice, solutions and progress tracking.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT question bank",
    "ESAT topic practice",
    "ESAT Math 1 questions",
    "ESAT Physics questions",
    "ESAT Chemistry questions",
    "ESAT Biology questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "How many free questions are included?",
    answer:
      "Every subject includes 10 free practice questions. Paid access unlocks unlimited questions, full solutions, statistics and targeted drills.",
  },
  {
    question: "Which subjects are covered?",
    answer:
      "The question bank covers Math 1, Math 2, Physics, Chemistry and Biology. You can practice by topic within each subject.",
  },
  {
    question: "Does the question bank include past papers?",
    answer:
      "The question bank is designed for topic practice. For full past papers and official ENGAA/NSAA papers, see the past papers library.",
  },
];

export default function EsatQuestionBankPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Product"
      title="ESAT Question Bank"
      intro={[
        "Practice ESAT questions by topic across all five subjects. Start with 10 free questions per subject, or unlock unlimited access for full solutions, progress tracking and targeted drills.",
      ]}
      primaryCta={{ href: APP_ROUTES.questionBank, label: "Open the question bank" }}
      secondaryCta={{
        href: SEO_ROUTES.noCalcPractice,
        label: "No-calculator practice",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Start practicing by topic today",
        body: "The question bank lets you focus on specific topics across all five ESAT subjects. 10 free questions per subject, with full access unlocking unlimited practice, solutions and progress stats.",
        primary: { href: APP_ROUTES.questionBank, label: "Open the question bank" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "Browse past papers" },
      }}
      related={seoLinks("questionBankGuide", "maths1", "physics", "chemistry", "biology", "drill", "pastPapers")}
      sources={[SOURCES.contentSpec, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Question Bank",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What the question bank offers"
        lead="Topic-focused practice for every ESAT module with progress tracking and review features."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            { title: "Math 1", body: "Number, ratio, algebra, geometry, probability and statistics." },
            { title: "Math 2", body: "Advanced algebra, functions, trigonometry, logs and calculus-style reasoning." },
            { title: "Physics", body: "Mechanics, electricity, waves, thermal physics and proportional reasoning." },
            { title: "Chemistry", body: "Physical, inorganic and organic chemistry across ESAT topics." },
            { title: "Biology", body: "Cells, genetics, physiology and data interpretation." },
            { title: "Progress tracking", body: "Review wrong answers, track completion and focus on weak topics." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Free vs paid access">
        <SeoProse
          paragraphs={[
            "Every subject includes 10 free practice questions so you can try the question bank before committing. Paid access unlocks unlimited questions, full worked solutions, progress statistics and targeted drills.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Free tier: 10 questions per subject across all five modules.",
            "Paid access: unlimited questions, full solutions and detailed statistics.",
            "Topic selection: practice weak areas or complete full topic sets.",
            "Review mode: revisit wrong answers and track improvement over time.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Subject-specific practice">
        <SeoProse
          paragraphs={[
            "Each subject in the question bank is organized by topic, matching the official ESAT content specification. You can practice a single topic or work through complete subject coverage.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={questionBankSubjectHref("Math 1")}
            variant="quiet"
            placement="section"
          >
            Math 1 questions
          </SeoCta>
          <SeoCta
            href={questionBankSubjectHref("Math 2")}
            variant="quiet"
            placement="section"
          >
            Math 2 questions
          </SeoCta>
          <SeoCta
            href={questionBankSubjectHref("Physics")}
            variant="quiet"
            placement="section"
          >
            Physics questions
          </SeoCta>
          <SeoCta
            href={questionBankSubjectHref("Chemistry")}
            variant="quiet"
            placement="section"
          >
            Chemistry questions
          </SeoCta>
          <SeoCta
            href={questionBankSubjectHref("Biology")}
            variant="quiet"
            placement="section"
          >
            Biology questions
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="How to use the question bank">
        <SeoProse
          paragraphs={[
            "Start with the 10 free questions for each subject you plan to take. Use these to identify weak topics, then either drill those topics in the free tier or unlock full access for comprehensive practice.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Try the free questions first to understand the question style and difficulty.",
            "Identify weak topics using the progress tracker.",
            "Use topic practice alongside past papers for complete preparation.",
            "Review wrong answers before moving to new topics.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Question bank vs past papers">
        <SeoProse
          paragraphs={[
            "The question bank is designed for topic practice, not timed full-module tests. For complete mock exams and official past papers, use the past papers library alongside the question bank.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full past papers and mocks:{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>
            ESAT past papers library
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
