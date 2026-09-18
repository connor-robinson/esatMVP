import type { Metadata } from "next";
import Link from "next/link";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  breadcrumbSchema,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import {
  ESAT_MOCK_MODULES,
  ESAT_MOCK_QUESTION_COUNT,
  ESAT_MOCKS_PER_MODULE,
  TOTAL_ESAT_MOCK_COUNT,
  TOTAL_ESAT_MOCK_QUESTION_COUNT,
} from "@/lib/esatMockTests/catalog";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { EsatMockModuleSelector } from "@/components/esatMockTests/EsatMockModuleSelector";
import { EsatMockTestsIntroBanner } from "@/components/esatMockTests/EsatMockTestsIntroBanner";
import {
  HighlightBox,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";

const PATH = SEO_ROUTES.mockTests;
const SELECTOR_ID = "choose-mock";

const TITLE = "Free ESAT Mock Tests 2026 | 25 Full Mocks | ESAT CAMP";
const DESCRIPTION =
  "Take 25 free full-length ESAT mock tests for Maths 1, Maths 2, Physics, Chemistry and Biology. 27 questions, 40 minutes, with a predicted ESAT score in the simulator.";
const SEO_SUBTEXT =
  "Finished the official ESAT material? Take 25 free full-length mocks written and curated by us. Sit them in the ESAT simulator for a predicted ESAT score. Designed from 2025 student feedback that the real test felt harder than past papers.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT mock tests",
    "free ESAT mock tests",
    "ESAT mocks",
    "ESAT mock papers",
    "ESAT practice tests",
    "ESAT practice papers",
    "full ESAT mock",
    "ESAT Maths 1 mock",
    "ESAT Maths 2 mock",
    "ESAT Physics mock",
    "ESAT Chemistry mock",
    "ESAT Biology mock",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Are these official ESAT papers?",
    answer:
      "No. ESAT CAMP is independent and is not affiliated with UAT-UK, Pearson, Cambridge, Oxford or Imperial College London. Official materials should always be part of your preparation. These mocks are designed to provide fresh, unseen, full-length ESAT-format practice.",
  },
  {
    question: "Should I do NSAA and ENGAA papers first?",
    answer:
      "Usually, yes. They contain excellent admissions-test questions and should not be ignored. Our mocks become particularly useful when you are running out of unseen historical material or want to practise the pacing and stamina of the current ESAT format.",
  },
  {
    question: "How many questions are in each mock?",
    answer: "27 questions in 40 minutes.",
  },
  {
    question: "Can I use a calculator?",
    answer:
      "No. The ESAT is a no-calculator test, so these mocks should also be completed without one.",
  },
  {
    question: "How many mocks should I do?",
    answer:
      "Don't focus only on the number. A useful cycle is: take a mock, review every mistake, practise weak areas, then take the next mock. Five carefully reviewed mocks are much more useful than five rushed attempts.",
  },
  {
    question: "When should I take my final mock?",
    answer:
      "Save at least one until relatively close to your test. Take it under strict conditions: 40 minutes, no calculator, no pausing, no interruptions, and no checking answers halfway through. Treat it like the real module.",
  },
];

const FORMAT_STATS = [
  { value: String(ESAT_MOCK_QUESTION_COUNT), label: "questions" },
  { value: "40:00", label: "minutes" },
  { value: "~89 sec", label: "per question" },
  { value: "No", label: "calculator" },
] as const;

const QUESTIONS_PER_MODULE = ESAT_MOCKS_PER_MODULE * ESAT_MOCK_QUESTION_COUNT;

export default function EsatMockTestsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      compactTitle
      suppressVisibleTitle
      contentMaxWidth="wide"
      title="ESAT CAMP Free Mock Tests"
      visuallyHiddenIntro={SEO_SUBTEXT}
      faq={FAQ}
      faqHeading="ESAT mock tests FAQ"
      related={seoLinks(
        "pastPapers",
        "pastPapersGuide",
        "questionBank",
        "drill",
        "scoreConverter",
        "testDay",
      )}
      sources={[SOURCES.contentSpec, SOURCES.esatTest]}
      showDisclaimer
      finalCta={{
        heading: "You've practised the questions. Now practise the test.",
        body: `${TOTAL_ESAT_MOCK_COUNT} full ESAT mocks. ${TOTAL_ESAT_MOCK_QUESTION_COUNT} new questions. Five modules. Free.`,
        primary: {
          href: `#${SELECTOR_ID}`,
          label: "Start a mock",
        },
        secondary: {
          href: SEO_ROUTES.pastPapers,
          label: "Past papers",
        },
      }}
      schema={[
        articleSchema({
          headline: "ESAT CAMP Free Mock Tests",
          description: DESCRIPTION,
          path: PATH,
          dateModified: "2026-09-18",
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ESAT mock tests", path: PATH },
        ]),
      ]}
    >
      <section
        id={SELECTOR_ID}
        aria-label="Choose an ESAT module"
        className="-mt-2 scroll-mt-24 space-y-5 sm:-mt-3 sm:space-y-6"
      >
        <EsatMockTestsIntroBanner />
        <EsatMockModuleSelector />
      </section>

      <SeoSection heading="Train your stamina and improve your guessing">
        <SeoProse
          paragraphs={[
            "Stamina is what students reported feeling most underprepared for, because NSAA only has 20 questions per section. The ESAT has 27 questions in 40 minutes, so these mocks are built to train for that.",
            "And our answers are also designed to help you improve your ability to eliminate options and improve your guessing when time runs out.",
          ]}
        />
      </SeoSection>

      <Link
        href={SEO_ROUTES.pastPapers}
        className="group flex flex-col gap-3 rounded-2xl bg-white/[0.04] px-5 py-5 transition-colors hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-6"
      >
        <div className="min-w-0 space-y-1.5">
          <p className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            Official past paper simulators
          </p>
          <p className="text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Still working through NSAA and ENGAA? Practise them timed in the
            ESAT simulator.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#93C5FD] transition-colors group-hover:text-[#BFDBFE]">
          Open past papers
          <span aria-hidden className="text-lg leading-none">
            →
          </span>
        </span>
      </Link>

      <SeoSection heading="Why ESAT CAMP Mocks?">
        <SeoProse
          paragraphs={[
            "We have curated our questions to be chosen from commonly missed topics, and to reflect the real difficulty of the ESAT. We think that our ESAT CAMP Mocks are a better representation of the real ESAT than any NSAA or ENGAA past papers.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Finished all your ESAT material?">
        <SeoProse
          paragraphs={[
            "If you've finished all your ENGAA and NSAA past papers already, what's the point of redoing them? Instead, try our ESAT CAMP Free Mock papers to train your ability to problem-solve and think on the spot. They are designed to be time-pressured, so don't worry if you are getting slightly lower scores.",
            "Unlike the NSAA and ENGAA, which have fewer questions, our mocks have 27 full questions: a much better representation of the stamina you will need in the real exam.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Built for the current ESAT format">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FORMAT_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/[0.04] px-4 py-4 text-center sm:py-5"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {stat.value}
              </dd>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#64748B]">
                {stat.label}
              </p>
            </div>
          ))}
        </dl>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Of course, NSAA and ENGAA papers are still the best source for ESAT practice. But they were written for older admissions tests with different structures and fewer questions. Our mocks are designed around the current ESAT format and the stamina required to keep solving under pressure.",
            "Many students have also reported seeing a lot more diagrams and question types in the ESAT compared to the NSAA / ENGAA papers, so we have tried our very best to write questions in this style.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Designed to feel harder.">
        <SeoProse
          paragraphs={[
            "Students who sat the ESAT told us the same thing: the real test felt tougher and more time-pressured than the NSAA and ENGAA material they had practised beforehand. Based on their feedback and our tutors' experience, these mocks have been deliberately curated to be demanding.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Difficult questions.",
            "More information to process (more tedious questions).",
            "More graph reading and diagrams.",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "If you can stay composed doing our mocks, the real ESAT should feel less intimidating.",
            "Expose your weaknesses today rather than on test day.",
          ]}
        />
      </SeoSection>

      <SeoSection
        heading={`${TOTAL_ESAT_MOCK_QUESTION_COUNT} new questions.`}
        lead={`There are ${TOTAL_ESAT_MOCK_COUNT} complete mocks across the five ESAT modules, with completely original questions you won't find anywhere else.`}
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ESAT_MOCK_MODULES.map((module) => (
            <li
              key={module.id}
              className="rounded-2xl bg-white/[0.04] px-4 py-4"
            >
              <p className="font-semibold text-white">{module.fullLabel}</p>
              <p className="mt-1 text-sm text-[#94A3B8]">
                {module.mockCount} mocks
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-[#64748B]">
                {QUESTIONS_PER_MODULE} questions
              </p>
            </li>
          ))}
        </ul>
      </SeoSection>

      <SeoSection heading="Not recycled past-paper questions.">
        <SeoProse
          paragraphs={[
            "You can only redo the same material so many times, but these questions were handwritten and curated by us specifically for ESAT practice.",
            "They are not NSAA or ENGAA questions. Every mock is deliberately assembled around ESAT-style reasoning, realistic topic coverage, convincing distractors, time pressure, question ordering, difficulty progression and overall paper stamina.",
            "We aim to give you material you haven't already seen.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Built around what students actually found difficult.">
        <SeoProse
          paragraphs={[
            "Our former students consistently told us that the real ESAT felt harder and more time-pressured than the historical NSAA and ENGAA material they used to prepare.",
            "Our tutors reported the same problem: old papers are excellent practice, but they do not always recreate the pressure, pacing and stamina demanded by the current ESAT.",
            "So we designed our mocks around that gap.",
            "Using feedback from 300+ students who have sat the ESAT, alongside our tutors' experience, we have handwritten, reviewed and curated each mock to test sustained performance across all 27 questions, aggressive time pressure, convincing distractors, careful reading, unfamiliar problem solving, pacing and question selection, and staying accurate when tired.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Your score is only half the story.">
        <SeoProse
          paragraphs={[
            "A 20/27 achieved calmly with five minutes remaining is very different from a 20/27 achieved by guessing the final six questions.",
            "After every mock, look at accuracy, time per question, and the topics costing you marks.",
            "Then fix those weaknesses before taking the next mock.",
          ]}
        />
        <HighlightBox className="mt-6" title="Review → practise → retest.">
          <p>
            Use the review after each attempt, then open the{" "}
            <SeoTextLink href={APP_ROUTES.questionBankHome}>
              ESAT Question Bank
            </SeoTextLink>{" "}
            or{" "}
            <SeoTextLink href={SEO_ROUTES.noCalcPractice}>
              no-calculator practice
            </SeoTextLink>{" "}
            before the next mock.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoCtaRow className="mt-2">
        <SeoCta href={`#${SELECTOR_ID}`} placement="conditions">
          Start a free ESAT mock
        </SeoCta>
        <SeoCta
          href={APP_ROUTES.scoreConverter}
          variant="quiet"
          placement="conditions"
        >
          Score converter
        </SeoCta>
        <SeoCta
          href={SEO_ROUTES.testDay}
          variant="quiet"
          placement="conditions"
        >
          Test-day guide
        </SeoCta>
      </SeoCtaRow>
    </SeoPageLayout>
  );
}
