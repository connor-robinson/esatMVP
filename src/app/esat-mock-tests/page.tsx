import type { Metadata } from "next";
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
import { PastPaperDownloadSections } from "@/components/pastPapersDownload";
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

const MOCK_PROGRESSION = [
  { mock: "Mock 1", focus: "Find your baseline." },
  { mock: "Mock 2", focus: "Fix the obvious weaknesses." },
  { mock: "Mock 3", focus: "Improve your pacing." },
  { mock: "Mock 4", focus: "Practise under strict exam conditions." },
  { mock: "Mock 5", focus: "Treat it like the real thing." },
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
        body: `${TOTAL_ESAT_MOCK_COUNT} full ESAT mocks. ${TOTAL_ESAT_MOCK_QUESTION_COUNT} unseen questions. Five modules. Free.`,
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
        <div className="rounded-2xl bg-white/[0.04] px-4 py-4 sm:px-5">
          <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            Stamina is what students felt least prepared for
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            This is what students reported feeling most underprepared for,
            because they only did NSAA papers which had only 19 questions, one
            paper at a time. The ESAT asks you to keep performing across 27
            questions in 40 minutes, so these mocks are built to train that
            stretch.
          </p>
        </div>
        <p className="text-sm leading-relaxed text-[#64748B]">
          {TOTAL_ESAT_MOCK_COUNT} original mocks across Maths 1, Maths 2,
          Physics, Chemistry and Biology. Free to take.{" "}
          <SeoTextLink href="/esat-mock-tests/compare">
            Invite a friend
          </SeoTextLink>{" "}
          to the same paper (no signup). Save scores by creating an account
          after an attempt.
        </p>
      </section>

      <SeoSection heading="Official past papers">
        <SeoProse
          paragraphs={[
            "Still working through NSAA and ENGAA? Download the papers and answer keys below, or practise them in the ESAT simulator from Past Papers.",
          ]}
        />
        <div className="mt-6">
          <PastPaperDownloadSections />
        </div>
      </SeoSection>

      <SeoSection heading="Finished all your ESAT material?">
        <SeoProse
          paragraphs={[
            "There comes a point where doing another old NSAA or ENGAA paper gives you less and less.",
            "You recognise the questions. You remember the methods. Sometimes you even remember the answers.",
            "But the real ESAT requires you to keep performing across 27 questions in only 40 minutes.",
            "That is what these mocks are built for.",
          ]}
        />
        <div className="mt-8 space-y-3">
          <p className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Past papers train the questions.
          </p>
          <p className="font-display text-2xl font-bold tracking-tight text-[#93C5FD] sm:text-3xl">
            Mocks train the test.
          </p>
        </div>
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
            "NSAA and ENGAA papers remain excellent practice.",
            "But they were written for older admissions tests with different structures and pacing.",
            "Our mocks are designed around the current ESAT format and the stamina required to keep solving under pressure.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Designed to feel harder.">
        <SeoProse
          paragraphs={[
            "Students who sat the ESAT told us the same thing repeatedly: the real test felt tougher and more time-pressured than the material they had practised beforehand.",
            "So we took that seriously.",
            "Based on their feedback and our tutors' experience, these mocks have been deliberately curated to be demanding.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Hard questions.",
            "Tight timing.",
            "Convincing wrong answers.",
            "Very little room for careless mistakes.",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "The idea is simple: if you can stay composed here, the real ESAT should feel less intimidating.",
            "We would much rather expose your weaknesses during Mock 2 than on test day.",
          ]}
        />
      </SeoSection>

      <SeoSection
        heading={`${TOTAL_ESAT_MOCK_QUESTION_COUNT} unseen questions.`}
        lead={`There are ${TOTAL_ESAT_MOCK_COUNT} complete mocks across the five ESAT modules.`}
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
            "You can only redo the same material so many times.",
            "These questions were handwritten and curated by us specifically for ESAT practice.",
            "They are not simply NSAA or ENGAA questions rearranged into a new paper.",
            "Every mock is deliberately assembled around ESAT-style reasoning, realistic topic coverage, convincing distractors, time pressure, question ordering, difficulty progression and overall paper stamina.",
            "The aim is simple: give you material you haven't already seen.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Built around what students actually found difficult.">
        <SeoProse
          paragraphs={[
            "Our former students consistently told us that the real ESAT felt harder and more time-pressured than the historical NSAA and ENGAA material they used to prepare.",
            "Our tutors reported the same problem: old papers are excellent practice, but they do not always recreate the pressure, pacing and stamina demanded by the current ESAT.",
            "So we designed our mocks around that gap.",
            "Using feedback from students who have sat the ESAT, alongside our tutors' experience, we have handwritten, reviewed and curated each mock to test sustained performance across all 27 questions, aggressive time pressure, convincing distractors, careful reading, unfamiliar problem solving, pacing and question selection, and staying accurate when tired.",
            "The goal isn't to predict the exact questions you'll see. It's to make sure the real test doesn't feel like the first time you've experienced that level of pressure.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="The bit practice sets don't test: stamina.">
        <SeoProse
          paragraphs={[
            "Getting one difficult question right is one skill.",
            "Getting question 24 right after 35 minutes of calculations, diagrams and decision-making is another.",
            "By the end of a real module, you may be rushing, second-guessing yourself, making arithmetic mistakes, rereading simple questions, or spending too long on one problem.",
            "That isn't separate from the ESAT. That is part of the ESAT.",
          ]}
        />
        <p className="mt-6 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          So train it.
        </p>
      </SeoSection>

      <SeoSection heading="Five mocks. Five chances to improve.">
        <ol className="space-y-3">
          {MOCK_PROGRESSION.map((step) => (
            <li
              key={step.mock}
              className="flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className="shrink-0 font-semibold text-white">
                {step.mock}
              </span>
              <span className="text-sm leading-relaxed text-[#94A3B8] sm:text-base">
                {step.focus}
              </span>
            </li>
          ))}
        </ol>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Don't burn through all five in one weekend.",
            "The value comes from what you do between them.",
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

      <SeoSection heading="The questions you get wrong are the useful ones.">
        <SeoProse
          paragraphs={[
            "A mock where you score 27/27 feels good.",
            "A mock that discovers three weaknesses you didn't know you had may be more useful.",
            "You would rather discover them here than on test day.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Already completed the past papers?">
        <SeoProse
          paragraphs={[
            "Good. You should.",
            "Official and historical material should be a major part of your preparation.",
            "But once you have worked through it properly, repeatedly recycling familiar questions becomes less representative.",
            "That is where these mocks fit.",
            "Past papers first. Unseen mocks next.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Start with the{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>
            ESAT past papers library
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
            past-paper guide
          </SeoTextLink>
          , then return here for full-length mocks.
        </p>
      </SeoSection>

      <SeoSection heading="Try one under proper conditions.">
        <SeoProse
          paragraphs={[
            'Not while watching YouTube. Not with your calculator beside you. Not with unlimited time because "it\'s only practice."',
            "Set 40 minutes. Use scrap paper. Put your phone away. Start the timer.",
            "And see where you actually are.",
          ]}
        />
        <SeoCtaRow className="mt-7">
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
      </SeoSection>
    </SeoPageLayout>
  );
}
