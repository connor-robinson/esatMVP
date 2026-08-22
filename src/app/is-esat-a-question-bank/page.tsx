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
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.questionBankGuide;

const TITLE =
  "Is the ESAT a Question Bank? Can Questions Repeat Between Test Dates?";
const DESCRIPTION =
  "Can ESAT questions repeat? Find out what is officially known about test versions, question overlap, October vs January and student reports.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT question bank",
    "ESAT questions repeat",
    "ESAT October vs January",
    "ESAT test versions",
    "ESAT live questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is the ESAT a published question bank?",
    answer:
      "UAT-UK does not publicly describe the ESAT as a fixed, published question bank, and it does not publish enough information to quantify how much live-question overlap exists.",
  },
  {
    question: "Does everyone get the same ESAT questions?",
    answer:
      "UAT-UK does not publish a simple public rule saying every candidate everywhere receives an identical set. We do not have enough public data to state this as fact either way.",
  },
  {
    question: "Is the January sitting easier?",
    answer:
      "There is no published evidence that one sitting is inherently easier. For Cambridge and Oxford standard applicants the sitting still matters because they normally require October.",
  },
];

export default function IsEsatAQuestionBankPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test security"
      title="Is the ESAT a Question Bank?"
      intro={[
        "UAT-UK does not describe the ESAT as a fixed, published question bank, and it does not publish enough information to say how much live-question overlap exists between sittings.",
      ]}
      lastChecked
      primaryCta={{ href: SEO_ROUTES.pastPapers, label: "Official past papers" }}
      secondaryCta={{ href: SEO_ROUTES.preparation, label: "Preparation guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Prepare for the specification, not a rumour",
        body: "Use official papers, ENGAA and NSAA where they overlap, and ESAT-style practice. Do not build a plan around remembered live questions.",
        primary: { href: APP_ROUTES.questionBank, label: "Open the question bank" },
        secondary: { href: SEO_ROUTES.engaaNsaaPapers, label: "ENGAA and NSAA papers" },
      }}
      related={seoLinks(
        "pastPapers",
        "engaaNsaaPapers",
        "preparation",
        "questionBank",
        "testDates",
        "goodScore",
      )}
      sources={[
        SOURCES.results,
        SOURCES.deadlines,
        SOURCES.testDayOfficial,
        SOURCES.cambridgeEsat,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Is the ESAT a Question Bank?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="What is officially known">
        <SeoList
          items={[
            "ESAT is delivered through Pearson VUE test centres.",
            "UAT-UK uses equating and scaling so different test versions remain comparable.",
            "Test security is a major issue.",
            "Candidates only sit the ESAT once per admissions cycle.",
            "Cambridge and Oxford standard applicants normally use October.",
            "Some other applicants may have the option of January.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What is not publicly known">
        <SeoProse
          paragraphs={[
            "UAT-UK does not publicly specify a simple rule that every candidate everywhere receives an identical set of questions.",
            "We do not have enough public data to say how often live questions repeat, or to quantify overlap between October and January.",
          ]}
        />
        <HighlightBox className="mt-5" title="Do not plan your preparation around remembered live questions.">
          <p>
            Possibly some questions can repeat. There is not enough official
            data to quantify this. Do not prepare on the assumption that a
            friend's question will repeat.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="What students sometimes report">
        <SeoProse
          paragraphs={[
            "Student reports are anecdotal. They can tell you how a sitting felt. They cannot give you a reliable paper for next year.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            'Useful: "Was the Physics module hard?" "Did you run out of time?" "Did graphs come up often?"',
            "Not useful as a preparation strategy: exact live questions, answers and reconstructed papers.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Does October vs January matter?">
        <SeoProse
          paragraphs={[
            "For Cambridge and Oxford standard applicants, yes, because they normally require October. For applicants permitted to choose either, there is no published evidence that one sitting is inherently easier.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Sitting rules:{" "}
          <SeoTextLink href={SEO_ROUTES.testDates}>when is the ESAT 2027</SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="What this means for preparation">
        <SeoProse
          paragraphs={[
            "Prepare for the specification, question style and reasoning. Do not build your strategy around predicted repeats or rumours from an earlier test date.",
            "UAT-UK has taken test-security risks seriously. Do not obtain, circulate or sell live test content.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Use{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapers}>past papers</SeoTextLink>,{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={APP_ROUTES.questionBank}>
            ESAT CAMP question bank
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
