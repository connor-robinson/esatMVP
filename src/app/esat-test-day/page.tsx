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
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
  SummaryBox,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.testDay;

const TITLE = "ESAT Test Day 2026/27 | Timing, Breaks & What to Expect";
const DESCRIPTION =
  "A practical guide to ESAT test day: module timing, no automatic breaks, whiteboard rules, review screens, flagging questions and last-minute tips.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT test day",
    "ESAT breaks",
    "ESAT whiteboard",
    "ESAT test centre",
    "ESAT calculator",
    "ESAT timing",
    "ESAT Pearson VUE",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Are there breaks between ESAT modules?",
    answer:
      "There are no automatic breaks. A break is only available if it has been approved as part of an access arrangement.",
  },
  {
    question: "Can I use paper for working in the ESAT?",
    answer:
      "No personal paper is allowed. You are given a whiteboard or laminated sheet and a marker pen for rough working.",
  },
  {
    question: "Can I come back to an earlier ESAT module?",
    answer:
      "No. Once you end a module, you cannot return to it later. The review screen at the end of a module is your last chance to change answers.",
  },
];

export default function EsatTestDayPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title="What Is ESAT Test Day Like?"
      intro={[
        "The ESAT is a computer-based test taken at a Pearson VUE test centre. The academic challenge matters, but so do small practical details: no automatic breaks, no personal paper, separately timed modules and no calculator.",
      ]}
      lastChecked={{
        detail:
          "Test-day rules come from the UAT-UK candidate handbook linked below, which is reissued each cycle.",
      }}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Practise ESAT timing" }}
      secondaryCta={{ href: SEO_ROUTES.testDates, label: "Check the test dates" }}
      faq={FAQ}
      finalCta={{
        heading: "Practise the conditions, not just the content",
        body: "Pacing under a 40-minute clock is a separate skill from solving the questions. A timed diagnostic is the quickest way to find out whether your current pacing plan survives contact with the clock.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.calculatorRules, label: "Read the calculator rules" },
      }}
      related={seoLinks("calculatorRules", "preparation", "calibration", "testDates")}
      sources={[SOURCES.candidateHandbook, SOURCES.esatTest]}
      showDisclaimer
      schema={articleSchema({
        headline: "What Is ESAT Test Day Like?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="The basic format">
        <SummaryBox
          title="On the day"
          items={[
            "Computer-based at a Pearson VUE test centre.",
            "27 multiple-choice questions per module.",
            "40 minutes per module.",
            "Usually three modules for most candidates.",
            "Modules are timed separately.",
            "No calculator.",
            "No personal pen or paper.",
            "One mark per correct answer, no negative marking.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Breaks and timing">
        <SeoProse
          paragraphs={[
            "Do not plan on a normal break between modules. UAT-UK says modules are taken one after another, with no automatic breaks. If you stop the test for any reason, the timer does not stop, and that includes going to the toilet.",
          ]}
        />
        <HighlightBox className="mt-5" title="Before the test starts">
          <p>
            Use the toilet, check your marker works, and settle into a pacing plan.
            UAT-UK explicitly recommends using the toilet before the test begins.
            Once a module starts, treat the 40 minutes as fully active time.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="Rough working">
        <SeoProse
          paragraphs={[
            "You will be given a whiteboard or laminated sheet and a marker pen for working. Personal pen and paper are not allowed. If the board or pen is not working properly, raise your hand and ask the invigilator to replace it.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Keep working compact. Board space runs out faster than you expect.",
            "Write only the important intermediate step.",
            "Avoid filling the board with long algebra unless it is genuinely necessary.",
            "Mark questions where your working is incomplete, so the review screen is useful.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Navigation and review">
        <SeoProse
          paragraphs={[
            "You can flag questions for review. At the end of a module, the review screen shows flagged and unanswered questions. Once you end the module, you cannot return to it later.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={["Time remaining", "What to do"]}
          rows={[
            [
              "40–25 min",
              "First pass. Answer quick and medium questions. Flag the heavy ones and move on.",
            ],
            [
              "25–8 min",
              "Work through flagged questions, starting with the ones most likely to come out.",
            ],
            [
              "Final 8 min",
              "Fill every blank, check arithmetic traps, and leave nothing empty. There is no negative marking.",
            ],
          ]}
          caption="A pacing suggestion, not an official instruction. Adjust it to how your own first pass usually goes."
        />
      </SeoSection>

      <SeoSection heading="Order of modules">
        <SeoProse
          paragraphs={[
            "Your selected modules are taken one after another, and each module is separately timed.",
            "We do not publish a fixed universal module order. Public UAT-UK material confirms the modules are separate and consecutive, but we have not found an official statement guaranteeing one order for every possible module combination, so treat any specific ordering you read online with caution.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Last-week checklist">
        <SeoList
          items={[
            "Know exactly which modules you are sitting.",
            "Practise at least one full 40-minute module block.",
            "Try the official sample interface on a desktop, not a phone.",
            "Practise with no calculator.",
            "Practise compact rough working on a small surface.",
            "Prepare ID and test-centre logistics, including travel time.",
          ]}
        />
        <p className="mt-6 text-sm leading-relaxed text-[#94A3B8]">
          Related:{" "}
          <SeoTextLink href={SEO_ROUTES.commonMistakes}>
            common preparation mistakes
          </SeoTextLink>{" "}
          covers the habits that cause most of the avoidable losses in the final
          fortnight.
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
