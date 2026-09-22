import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { ESAT_MOCKS_PER_MODULE } from "@/lib/esatMockTests/catalog";
import {
  CALIBRATION_AGGREGATES,
  OVERALL_FIRST_ATTEMPT_ACCURACY,
  PACING_AGGREGATES,
} from "@/content/esatPreparation";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { SeoCta, SeoCtaRow } from "@/components/seo/SeoCta";
import {
  HighlightBox,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoSubheading,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import { AccuracyByTimeChart } from "@/components/esatPreparation/AccuracyByTimeChart";
import { AnkiCardCompare } from "@/components/esatPreparation/AnkiCardCompare";
import { CalibrationScoreChart } from "@/components/esatPreparation/CalibrationScoreChart";
import { CondensedPastPaperRoadmap } from "@/components/esatPreparation/CondensedPastPaperRoadmap";
import { DataMethodologyNote } from "@/components/esatPreparation/DataMethodologyNote";
import { DuplicateRulesTeaser } from "@/components/esatPreparation/DuplicateRulesTeaser";
import { PrepPipeline } from "@/components/esatPreparation/PrepPipeline";
import {
  PrepResourceDirectory,
  type PrepResourceRow,
} from "@/components/esatPreparation/PrepResourceDirectory";
import { PrepToolCards } from "@/components/esatPreparation/PrepToolCards";
import { TopicAccuracyChart } from "@/components/esatPreparation/TopicAccuracyChart";
import { TwentyOneDayTimeline } from "@/components/esatPreparation/TwentyOneDayTimeline";

const PATH = SEO_ROUTES.preparation;

const TITLE =
  "ESAT Preparation: How to Prepare for the ESAT in 3 Weeks | ESAT CAMP";
const DESCRIPTION =
  "Three weeks until the ESAT? Follow a practical preparation plan using past papers, free mocks, calibration data, timed practice and targeted revision.";
const HEADLINE = "ESAT Preparation: How to Prepare for the ESAT in 3 Weeks";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT preparation",
    "how to prepare for ESAT",
    "ESAT revision",
    "ESAT study plan",
    "ESAT 3 week plan",
    "ESAT past papers",
    "ESAT mock tests",
  ],
});

const RESOURCES: readonly PrepResourceRow[] = [
  {
    id: "spec",
    title: "Official ESAT specification",
    body: "Know exactly what can be tested.",
    href: SOURCES.contentSpec.url,
    placement: "resource_spec",
    external: true,
  },
  {
    id: "calibration",
    title: "Free calibration",
    body: "Estimate your current level and find obvious weaknesses.",
    href: APP_ROUTES.calibration,
    placement: "resource_calibration",
    feature: "calibration",
  },
  {
    id: "simulator",
    title: "Free past-paper simulator",
    body: "Complete relevant NSAA and ENGAA material under timed conditions.",
    href: APP_ROUTES.pastPapers,
    placement: "resource_simulator",
    feature: "past_papers",
  },
  {
    id: "converter",
    title: "Free score converter",
    body: "Turn raw legacy-paper marks into a useful benchmark.",
    href: APP_ROUTES.scoreConverter,
    placement: "resource_converter",
    feature: "score_converter",
  },
  {
    id: "roadmap",
    title: "Free past-paper roadmap",
    body: "See what to do and which duplicated questions to avoid.",
    href: SEO_ROUTES.pastPapersGuide,
    placement: "resource_roadmap",
  },
  {
    id: "mocks",
    title: "Five free ESAT mocks",
    body: "Move onto unseen ESAT-format practice.",
    href: SEO_ROUTES.mockTests,
    placement: "resource_mocks",
    feature: "mocks",
  },
  {
    id: "mental-maths",
    title: "Mental maths",
    body: "Train no-calculator speed where it is actually costing you time.",
    href: APP_ROUTES.noCalcPractice,
    placement: "resource_mental_maths",
    feature: "mental_maths",
  },
  {
    id: "question-bank",
    title: "Question bank",
    body: "Target individual topics and practise fresh questions.",
    href: APP_ROUTES.questionBank,
    placement: "resource_question_bank",
    feature: "question_bank",
  },
];

export default function EsatPreparationPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="21-day plan"
      title={HEADLINE}
      intro={[
        "There are three weeks until the October ESAT.",
        "If you have been preparing for months, you should now be moving away from learning content and towards timed papers, mocks and fixing whatever still goes wrong.",
        "If you haven't, this is not the point at which we tell you that you really should have started in June. That would be both true and spectacularly unhelpful.",
        "Three weeks is still enough time to improve quite a lot.",
        "The important thing is the order.",
      ]}
      introFullWidth
      finalCta={{
        heading: "Start with what is actually wrong",
        body: "You do not need to pay for a preparation course to prepare properly for the ESAT. Use whatever combination of resources works for you. The important bit is to start doing the right work now.",
        primary: {
          href: APP_ROUTES.calibration,
          label: "Take the free calibration",
        },
        secondary: {
          href: "#twenty-one-day-roadmap",
          label: "See the 3-week roadmap",
        },
      }}
      related={seoLinks(
        "pastPapersGuide",
        "mockTests",
        "calibration",
        "scoreConverter",
        "drill",
        "questionBank",
        "pastPapers",
        "testDates",
      )}
      sources={[
        SOURCES.esatTest,
        SOURCES.prepare,
        SOURCES.contentSpec,
        SOURCES.esatPrepMaterials,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: HEADLINE,
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <PrepPipeline />

      <p className="text-sm font-semibold text-[#93C5FD]">
        Almost everything on this page can be done for free.
      </p>

      <SeoCtaRow>
        <SeoCta
          href={APP_ROUTES.calibration}
          placement="hero"
          feature="calibration"
        >
          Start with the free calibration
        </SeoCta>
        <SeoCta
          href={APP_ROUTES.pastPapers}
          variant="quiet"
          placement="hero_secondary"
          feature="past_papers"
        >
          Open free past papers
        </SeoCta>
      </SeoCtaRow>

      <SeoSection heading="First: work out what is actually wrong">
        <SeoProse
          paragraphs={[
            "Before doing another 200 questions, spend 20 minutes finding out what you are bad at.",
            "This sounds obvious. Students remain remarkably committed to avoiding it.",
          ]}
        />

        <p className="mt-6 leading-relaxed text-[#94A3B8]">
          Lost marks come from different causes. Treating them all as &ldquo;need
          more practice&rdquo; wastes the three weeks you have.
        </p>

        {/* Mobile stacked diagnosis table */}
        <ul className="mt-6 space-y-3 sm:hidden">
          {[
            [
              "You know the method but run out of time",
              "Calculation speed or question selection",
            ],
            [
              "You finish comfortably but lose marks",
              "Accuracy and reading",
            ],
            ["The same topic keeps going wrong", "Content gap"],
            ["You spend several minutes stuck", "Question selection"],
            ["Your score varies wildly", "Inconsistent pacing or method"],
          ].map(([what, problem]) => (
            <li key={what} className="rounded-2xl bg-[#161D2F] px-4 py-4">
              <p className="font-semibold text-white">{what}</p>
              <p className="mt-2 text-sm text-[#94A3B8]">{problem}</p>
            </li>
          ))}
        </ul>

        <ResponsiveTable
          className="mt-6 hidden sm:block"
          columns={["What happens", "Likely problem"]}
          rows={[
            [
              "You know the method but run out of time",
              "Calculation speed or question selection",
            ],
            [
              "You finish comfortably but lose marks",
              "Accuracy and reading",
            ],
            ["The same topic keeps going wrong", "Content gap"],
            ["You spend several minutes stuck", "Question selection"],
            ["Your score varies wildly", "Inconsistent pacing or method"],
          ]}
        />

        <p className="mt-6 leading-relaxed text-[#94A3B8]">
          Our free Mathematics 1 calibration contains 15 questions and estimates
          your current ESAT level.
        </p>

        <div className="mt-6 grid gap-6 rounded-2xl bg-white/[0.04] p-5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
                Mean calibration score
              </dt>
              <dd className="mt-1 text-2xl font-display font-bold text-white">
                {CALIBRATION_AGGREGATES.meanScoreLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
                Median estimated ESAT score
              </dt>
              <dd className="mt-1 text-2xl font-display font-bold text-white">
                {CALIBRATION_AGGREGATES.medianEstimatedEsat}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
                Median projected module raw score
              </dt>
              <dd className="mt-1 text-2xl font-display font-bold text-white">
                {CALIBRATION_AGGREGATES.medianProjectedRaw}
              </dd>
            </div>
          </dl>
          <CalibrationScoreChart />
        </div>

        <SeoCtaRow className="mt-7">
          <SeoCta
            href={APP_ROUTES.calibration}
            placement="calibration"
            feature="calibration"
          >
            Take the free calibration
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="Week 1: finish the useful past papers">
        <SeoProse
          paragraphs={[
            "If you have already worked through most of the NSAA and ENGAA material: good. You can move quickly to the next section.",
            "If you haven't, start here.",
            "Official material should still form the foundation of your preparation.",
          ]}
        />

        <p className="mt-6 leading-relaxed text-[#94A3B8]">
          There is, however, a mildly annoying problem.
        </p>
        <p className="mt-3 text-lg font-semibold leading-snug text-white">
          ENGAA and NSAA repeat a lot of questions.
        </p>
        <p className="mt-3 leading-relaxed text-[#94A3B8]">
          Doing both blindly can make you feel extremely productive while
          occasionally doing the same question twice.
        </p>

        <div className="mt-8">
          <CondensedPastPaperRoadmap />
        </div>

        <div className="mt-10">
          <SeoSubheading>A short duplicate warning</SeoSubheading>
        </div>
        <div className="mt-4">
          <DuplicateRulesTeaser />
        </div>

        <div className="mt-10">
          <SeoSubheading>Don&apos;t waste the paper afterwards</SeoSubheading>
        </div>
        <SeoProse
          className="mt-4"
          paragraphs={[
            "We have put the papers into a free simulator so you can practise them on screen rather than treating a PDF like a worksheet.",
            "Once you finish, put the raw mark into the free score converter.",
            "The score is useful. The mistakes are more useful.",
          ]}
        />
        <PrepToolCards
          className="mt-6"
          simulatorHref={APP_ROUTES.pastPapers}
          converterHref={APP_ROUTES.scoreConverter}
        />
      </SeoSection>

      <SeoSection heading="Then move on to proper ESAT mocks">
        <SeoProse
          paragraphs={[
            "Past papers eventually have a problem: none of them are actually the current ESAT.",
            "NSAA and ENGAA remain very useful because the style and underlying skills are close. Their structures are not identical, though, and some older material no longer matches the specification.",
            "Once you have used the highest-value legacy material, start doing full ESAT-format mocks.",
          ]}
        />

        <HighlightBox className="mt-6" tone="accent">
          <p>
            We currently have{" "}
            <span className="font-bold text-white">
              {ESAT_MOCKS_PER_MODULE} full ESAT mocks available free
            </span>{" "}
            for each module.
          </p>
        </HighlightBox>

        <SeoCtaRow className="mt-6">
          <SeoCta
            href={SEO_ROUTES.mockTests}
            placement="mocks"
            feature="mocks"
          >
            Try the free ESAT mocks
          </SeoCta>
        </SeoCtaRow>

        <SeoProse
          className="mt-8"
          paragraphs={[
            "Do them properly.",
            "No calculator.",
            "40 minutes.",
            "No pausing because somebody has messaged you.",
            "Write down which questions took too long, which ones you guessed, and which mistakes you could have prevented.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="The 90-second problem">
        <SeoProse
          paragraphs={[
            "The ESAT gives you roughly 89 seconds per question.",
            "This does not mean every question deserves 89 seconds.",
          ]}
        />

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
              Median first-attempt question time
            </dt>
            <dd className="mt-2 text-2xl font-display font-bold text-white">
              {PACING_AGGREGATES.medianFirstAttemptSeconds} seconds
            </dd>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748B]">
              Accuracy peak
            </dt>
            <dd className="mt-2 text-2xl font-display font-bold text-white">
              {PACING_AGGREGATES.peakAccuracyPercent}%
            </dd>
            <p className="mt-1 text-sm text-[#94A3B8]">
              for questions answered within about{" "}
              {PACING_AGGREGATES.peakBucketLabel}
            </p>
          </div>
        </dl>

        <p className="mt-5 leading-relaxed text-[#94A3B8]">
          Answers made very quickly or after very long attempts both sit around
          the mid-40% accuracy range.
        </p>

        <div className="mt-8 rounded-2xl bg-[#161D2F] p-5 sm:p-6">
          <AccuracyByTimeChart />
        </div>

        <SeoProse
          className="mt-8"
          paragraphs={[
            "This does not make 73 seconds some magical optimum.",
            "It suggests a much duller rule:",
          ]}
        />
        <p className="mt-3 text-lg font-semibold leading-snug text-white">
          Don&apos;t rush questions you can solve, and don&apos;t marry questions
          you cannot.
        </p>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "If you have spent roughly 90 seconds making no meaningful progress, moving on becomes increasingly attractive.",
            "You can come back.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What students are actually getting wrong">
        <SeoProse
          paragraphs={[
            "We looked at anonymised first attempts across the ESAT Camp question bank.",
          ]}
        />

        <p className="mt-6 text-lg font-semibold text-white">
          Overall first-attempt accuracy: {OVERALL_FIRST_ATTEMPT_ACCURACY}%
        </p>

        <div className="mt-6 rounded-2xl bg-[#161D2F] p-5 sm:p-6">
          <TopicAccuracyChart />
        </div>

        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          These are students using ESAT Camp, rather than a random sample of
          every ESAT candidate. Treat the figures as useful practice data, not a
          prediction of the real exam.
        </p>

        <div className="mt-10">
          <SeoSubheading>A few traps appear repeatedly</SeoSubheading>
        </div>
        <SeoList
          className="mt-4"
          items={[
            "Transformers involving power and cable resistance",
            "Stopping distance when velocity changes",
            "Histogram interpolation",
            "Moving plane mirrors",
            "Litres ↔ cubic metres / rate questions",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "The exact questions are not particularly important.",
            "The mistakes are.",
            "Students scale braking distance linearly when it depends on speed squared. They miss a litre conversion. They use the wrong relative velocity. They understand most of the physics and still lose the mark.",
            "These are excellent things to discover three weeks before the exam rather than three minutes after it.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Week 2: stop practising everything equally">
        <SeoProse
          paragraphs={[
            "Once you have enough evidence, your revision should become unfair.",
            "Give more time to the things costing you marks.",
            "If your fractions are slow, do fractions.",
            "If every mechanics question takes two minutes, do mechanics.",
            "If your only errors are misreads, doing another mechanics chapter probably will not save you.",
          ]}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <h3 className="font-bold text-white">Mental maths</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              Use for fractions, powers, rearranging expressions, arithmetic
              speed and estimation.
            </p>
            <p className="mt-4 text-sm">
              <SeoTextLink href={APP_ROUTES.noCalcPractice}>
                Open mental maths
              </SeoTextLink>
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <h3 className="font-bold text-white">Question bank</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              Use for weak subjects, weak syllabus topics, fresh ESAT-style
              questions and timed sets.
            </p>
            <p className="mt-4 text-sm">
              <SeoTextLink href={APP_ROUTES.questionBank}>
                Open the question bank
              </SeoTextLink>
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <h3 className="font-bold text-white">Review</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
              Use your previous mistakes rather than constantly finding new
              questions.
            </p>
          </div>
        </div>

        <SeoProse
          className="mt-8"
          paragraphs={[
            "ESAT Camp has tools for both mental maths and topic practice, but textbooks, school material and official questions can do the same job.",
            "The resource matters less than whether you are fixing the correct problem.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Yes, we suggest making Anki cards">
        <SeoProse
          paragraphs={[
            "This is one piece of advice that has nothing particularly sophisticated behind it.",
            "When you make a mistake that you could plausibly make again, save it.",
            "Not the entire question.",
            "Save the lesson.",
          ]}
        />
        <AnkiCardCompare className="mt-6" />
        <SeoProse
          className="mt-8"
          paragraphs={[
            "Your deck should slowly become a collection of your own recurring stupidity.",
            "This is useful.",
            "Five or ten minutes a day is enough. The point is to stop paying twice for the same mistake.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Week 3: simulate the test">
        <SeoProse
          paragraphs={[
            "By the final week, preparation should look increasingly like the real thing.",
            "A student taking three modules is doing roughly two hours of testing without a calculator.",
            "Concentration therefore becomes part of the test.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Complete modules under exact time",
            "Occasionally do the full sequence of modules",
            "Use consistent rough-working habits",
            "Practise moving on when stuck",
            "Return to flagged questions",
            "Review repeated errors afterwards",
          ]}
        />
        <SeoProse
          className="mt-8"
          paragraphs={[
            "Do not spend the final week collecting increasingly obscure content because somebody on Reddit announced that they have revised the coefficient of restitution in seven dimensions.",
            "The specification is finite.",
            "Use it.",
          ]}
        />
      </SeoSection>

      <SeoSection
        id="twenty-one-day-roadmap"
        heading="The 21-day timeline"
      >
        <TwentyOneDayTimeline />
      </SeoSection>

      <SeoSection heading="If you haven't done the past papers yet">
        <SeoProse
          paragraphs={[
            "You are behind the ideal schedule.",
            "You are not doomed.",
            "Do not respond by attempting every NSAA, ENGAA and TMUA paper ever printed over the next six days.",
            "Use the roadmap.",
            "Start with the material closest to the ESAT. Skip known duplicates. Review what goes wrong.",
            "Doing fewer papers properly is considerably better than speed-running a decade of admissions tests and reviewing none of them.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={SEO_ROUTES.pastPapersGuide}
            placement="behind_past_papers"
          >
            See which past papers to prioritise
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="If you have finished everything">
        <SeoProse
          paragraphs={[
            "Good.",
            "Now the problem changes.",
            "Past papers tell you less once you remember the answers.",
            "Use unseen mocks. Increase the amount you do under strict timing. Find fresh questions in your weakest areas. Practise full sittings rather than isolated questions.",
            "Keep reviewing mistakes.",
            "The glamorous answer to ESAT preparation would involve some clever secret technique.",
            "Unfortunately, quite a lot of it is noticing that you keep making the same mistake and then arranging not to make it again.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={SEO_ROUTES.mockTests}
            placement="finished_everything"
            feature="mocks"
          >
            Try an unseen mock
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="Everything you need to start">
        <PrepResourceDirectory resources={RESOURCES} />
        <SeoProse
          className="mt-8"
          paragraphs={[
            "You do not need to pay for a preparation course to prepare properly for the ESAT.",
            "Use whatever combination of resources works for you.",
            "The important bit is to start doing the right work now.",
          ]}
        />
        <SeoCtaRow className="mt-7">
          <SeoCta
            href={APP_ROUTES.calibration}
            placement="directory_calibration"
            feature="calibration"
          >
            Take the free calibration
          </SeoCta>
          <SeoCta
            href="#twenty-one-day-roadmap"
            variant="quiet"
            placement="directory_roadmap"
          >
            See the 3-week roadmap
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <DataMethodologyNote />
    </SeoPageLayout>
  );
}
