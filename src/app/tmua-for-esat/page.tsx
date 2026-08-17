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
  NumberedSteps,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  OfficialSourceDisclaimer,
  PaperUseGuide,
  PastPaperCTA,
  PastPaperTable,
} from "@/components/pastPapers";
import { papersByExam } from "@/content/pastPapers";

const PATH = SEO_ROUTES.tmuaForEsat;

const TITLE = "TMUA for ESAT | When It Helps Maths 2";
const DESCRIPTION =
  "TMUA is supplementary practice for ESAT Mathematics 2, not a substitute exam. Where it genuinely helps, where it wastes time, and every official paper.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "TMUA for ESAT",
    "TMUA ESAT Maths 2",
    "TMUA past papers",
    "TMUA practice for ESAT",
    "is TMUA useful for ESAT",
  ],
});

const TMUA_PAPERS = papersByExam("TMUA");
const PAPER_ONE = TMUA_PAPERS.filter((paper) => paper.sectionName === "Paper 1");
const PAPER_TWO = TMUA_PAPERS.filter((paper) => paper.sectionName === "Paper 2");

const FAQ: readonly FaqItem[] = [
  {
    question: "Is TMUA useful for ESAT preparation?",
    answer:
      "For maths, yes, as a supplement. TMUA Paper 1 is good practice at unfamiliar algebra and functions without a calculator, which is the same pressure ESAT Mathematics 2 applies. It does nothing for ESAT Physics, Chemistry or Biology, and it is not a substitute for the ENGAA and NSAA archives.",
  },
  {
    question: "Should I use TMUA before ENGAA and NSAA papers?",
    answer:
      "No. ENGAA and NSAA are much closer to the ESAT in format, timing and content, so they come first. Reach for TMUA when you have worked through the relevant legacy material, or when your maths is strong enough that ESAT-level questions no longer stretch you.",
  },
  {
    question: "Is TMUA harder than ESAT Maths 2?",
    answer:
      "It is differently hard rather than uniformly harder. TMUA gives you about three and three-quarter minutes per question against roughly ninety seconds in the ESAT, so individual questions go deeper while the time pressure is much lower. A TMUA score is not an ESAT prediction.",
  },
  {
    question: "Which TMUA paper should I use?",
    answer:
      "Paper 1, Applications of Mathematical Knowledge, transfers reasonably well to ESAT Mathematics 2. Paper 2, Mathematical Reasoning, is about logic, proof and spotting flawed arguments. Paper 2 is good thinking practice but the ESAT does not ask you to construct or critique proofs.",
  },
  {
    question: "Do TMUA papers come with worked solutions?",
    answer:
      "Yes, and this is TMUA's real advantage over the other archives. UAT-UK publishes full worked answers for both papers in every year, whereas ENGAA and NSAA come with an answer key only. If you want to learn method rather than check a letter, TMUA is the best material available.",
  },
];

export default function TmuaForEsatPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Supplementary practice"
      title="TMUA for ESAT Preparation"
      intro={[
        "TMUA is a separate admissions test, not an ESAT paper. Used at the right moment it is excellent extra practice for ESAT Mathematics 2 and for no-calculator fluency generally. Used at the wrong moment it is a detour into logic and proof, which the ESAT never asks about.",
        "This page is about that distinction: what TMUA is genuinely good for, what it cannot help with, and the order to reach for it in. Every official paper is linked below, including the worked answers.",
      ]}
      lastChecked={{
        detail:
          "Paper structure and timing come from the official UAT-UK TMUA pages. All paper links were opened and confirmed to resolve.",
      }}
      primaryCta={{
        href: APP_ROUTES.noCalcPractice,
        label: "Practise no-calculator maths",
      }}
      secondaryCta={{
        href: SEO_ROUTES.pastPapers,
        label: "Open the past-paper library",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Build the fluency first, then let TMUA stretch it",
        body: "Most people who struggle with Maths 2 are not short of hard questions. They are short of speed in the arithmetic underneath them. Ten-minute no-calculator drills fix that faster than another paper will.",
        primary: {
          href: APP_ROUTES.noCalcPractice,
          label: "Start no-calculator practice",
        },
        secondary: { href: SEO_ROUTES.maths2, label: "Read the Maths 2 guide" },
      }}
      related={seoLinks(
        "maths2",
        "pastPapers",
        "engaaNsaaPapers",
        "noCalcPractice",
        "drill",
        "calibration",
      )}
      sources={[
        SOURCES.tmuaTest,
        SOURCES.tmuaPrepMaterials,
        SOURCES.esatGuideMaths2,
        SOURCES.contentSpec,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "TMUA for ESAT Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="TMUA is supplementary, and that is the whole point"
        lead="It is a good second source for ESAT maths. It is a bad first source, and it is no source at all for the sciences."
      >
        <SeoProse
          paragraphs={[
            "The TMUA is the Test of Mathematics for University Admission. It runs as two papers of twenty multiple-choice questions with seventy-five minutes each: Paper 1 is Applications of Mathematical Knowledge, Paper 2 is Mathematical Reasoning. Like the ESAT, it is sat without a calculator.",
            "That shared no-calculator, multiple-choice character is why TMUA transfers at all. What does not transfer is the pace. Seventy-five minutes for twenty questions is roughly three and three-quarter minutes each, against something closer to ninety seconds in an ESAT module. TMUA questions are built to be chewed on; ESAT questions are built to be dispatched.",
            "So treat TMUA as a place to practise mathematical thinking, and treat ENGAA and NSAA as the place to practise being fast. Do not read a TMUA score as an ESAT prediction, because the two tests are not measuring the same thing.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Good uses and weaker uses">
        <PaperUseGuide
          goodForTitle="TMUA genuinely helps with"
          weakForTitle="TMUA does not help with"
          goodFor={[
            "Algebraic manipulation: rearranging, factorising and simplifying under pressure.",
            "Functions and graphs: transformations, roots, and reading behaviour off a curve.",
            "Non-calculator fluency with surds, indices, logarithms and fractions.",
            "Proof-style reasoning, in the narrow sense of following a chain of logic carefully.",
            "Timing discipline, if you deliberately cut the time allowance down.",
            "Learning method, because the worked answers explain the route rather than just naming the option.",
          ]}
          weakFor={[
            "ESAT Physics: TMUA contains no physics at all.",
            "ESAT Chemistry and Biology: likewise nothing.",
            "Maths 1 basics, which are better served by NSAA Part A and ENGAA Part A.",
            "Exam pacing, unless you shorten the time yourself, because TMUA allows far longer per question.",
            "Paper 2's formal logic and proof-critique questions, which have no ESAT equivalent.",
          ]}
        />
        <HighlightBox
          className="mt-6"
          tone="accent"
          title="If you only take one thing from TMUA"
        >
          <p>
            Take Paper 1 and the worked answers. Paper 1 is the half that looks
            like ESAT Mathematics 2 reasoning, and the worked answers are the only
            official solutions in any of these archives that show the method
            instead of just the correct letter.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection
        heading="Paper 1 against Paper 2 for ESAT"
        lead="The two papers are not equally useful, and the difference is large enough to matter."
      >
        <ResponsiveTable
          columns={["", "Paper 1", "Paper 2"]}
          rows={[
            [
              "What it tests",
              "Applications of mathematical knowledge",
              "Mathematical reasoning: logic, proof, flawed arguments",
            ],
            [
              "ESAT relevance",
              "Reasonable for Mathematics 2",
              "Low. The ESAT does not test proof",
            ],
            [
              "Best used for",
              "Algebra, functions, indices, logarithms, non-calculator fluency",
              "General mathematical thinking, if you have spare time",
            ],
            [
              "When to use it",
              "Once Maths 1 fundamentals and the legacy papers are done",
              "Only if you have run out of more relevant material",
            ],
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="A recommended order"
        lead="TMUA sits late in this list on purpose. Everything above it is closer to the exam you are actually sitting."
      >
        <NumberedSteps
          steps={[
            "Read the ESAT Guide for your modules, and the Notes on Mathematics for TMUA and ESAT Mathematics 2 if you are taking Maths 2.",
            "Fix no-calculator arithmetic speed first. It is the constraint underneath most Maths 1 and Maths 2 marks.",
            "Work the ENGAA papers for Maths 1, Maths 2 and Physics, using the duplicate list so you do not repeat questions.",
            "Add NSAA for Chemistry and Biology, and for extra maths and physics parts ENGAA does not cover.",
            "Bring in TMUA Paper 1 for harder algebra and function work, and read the worked answers properly when you get one wrong.",
            "Use TMUA Paper 1 with a shortened clock if you want it to double as timing practice.",
            "Only touch Paper 2 if you have genuinely exhausted the material above.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          The module-level detail behind step one is in the{" "}
          <SeoTextLink href={SEO_ROUTES.maths2}>ESAT Maths 2 guide</SeoTextLink>,
          and the legacy papers are covered on{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers for ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <PastPaperCTA
        heading="Fluency is the thing TMUA assumes you already have"
        body="TMUA questions are long enough that weak arithmetic quietly eats your time without ever being the reason you got a question wrong. Short timed drills are the cheapest way to remove that problem before it costs you ESAT marks."
        primary={{
          href: APP_ROUTES.noCalcPractice,
          label: "Start no-calculator practice",
        }}
        secondary={{
          href: APP_ROUTES.fermiGame,
          label: "Try the estimation game",
        }}
        placement="tmua_no_calc"
      />

      <SeoSection
        heading="Every official TMUA paper"
        lead="All published by UAT-UK, linked directly. Paper 1 first, since it is the one worth your time."
      >
        <h3 className="text-xl font-display font-bold text-white">
          Paper 1: Applications of Mathematical Knowledge
        </h3>
        <PastPaperTable
          className="mt-4"
          papers={PAPER_ONE}
          caption="Worked answers are published for every year, which makes these the best learning material in any of the archives."
        />

        <h3 className="mt-10 text-xl font-display font-bold text-white">
          Paper 2: Mathematical Reasoning
        </h3>
        <PastPaperTable
          className="mt-4"
          papers={PAPER_TWO}
          caption="Lower ESAT relevance. Useful for general reasoning practice, but the ESAT does not ask you to assess a proof."
        />
      </SeoSection>

      <OfficialSourceDisclaimer />
    </SeoPageLayout>
  );
}
