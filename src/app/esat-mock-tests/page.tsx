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
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.mockTests;

const TITLE = "ESAT Mock Tests | Full Module Practice Under Timing";
const DESCRIPTION =
  "Practice with full ESAT mock tests: 27 questions, 40 minutes, no calculator. ESAT CAMP mocks for Maths 1, Maths 2 and Physics are available in the past papers library for paid users.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT mock tests",
    "ESAT practice tests",
    "ESAT Maths 1 mock",
    "ESAT Physics mock",
    "ESAT timed practice",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "How many mock tests are available?",
    answer:
      "The past papers library includes 3 original Maths 1 mocks, 2 Maths 2 mocks and 2 Physics full mock modules. Free users can preview NSAA 2016 and 2017 past papers only.",
  },
  {
    question: "Are the mocks timed like the real ESAT?",
    answer:
      "Yes. Each mock follows ESAT timing: 27 questions in 40 minutes with no calculator. The interface records your time per question.",
  },
  {
    question: "Can I take a free diagnostic test?",
    answer:
      "Yes. The calibration test is a free Maths 1 diagnostic that records speed and accuracy. It is not a full 27-question mock, but it helps identify whether speed or knowledge is the issue.",
  },
];

export default function EsatMockTestsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Practice tools"
      title="ESAT Mock Tests"
      intro={[
        "Practice with full ESAT mock tests under real timing: 27 questions, 40 minutes, no calculator. ESAT CAMP original mocks are available in the past papers library for paid users.",
      ]}
      primaryCta={{ href: APP_ROUTES.pastPaperLibrary, label: "Open past papers library" }}
      secondaryCta={{
        href: APP_ROUTES.calibration,
        label: "Free calibration test",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Test yourself under real ESAT conditions",
        body: "The past papers library includes full mock tests for Maths 1, Maths 2 and Physics, plus official ENGAA and NSAA past papers. Start with the free calibration test to diagnose speed vs accuracy, then unlock full access for complete mock coverage.",
        primary: { href: APP_ROUTES.pastPaperLibrary, label: "Past papers library" },
        secondary: { href: APP_ROUTES.calibration, label: "Free calibration" },
      }}
      related={seoLinks("pastPapers", "pastPapersGuide", "calibration", "scoreConverter")}
      sources={[SOURCES.contentSpec, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Mock Tests",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="Available mock tests"
        lead="All mocks follow ESAT timing: 27 questions in 40 minutes with no calculator."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            { title: "Maths 1 mocks", body: "3 original full mock modules covering all Maths 1 topics." },
            { title: "Maths 2 mocks", body: "2 original full mock modules for advanced algebra and calculus reasoning." },
            { title: "Physics mocks", body: "2 original full mock modules covering mechanics, electricity and waves." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Free vs paid access">
        <SeoProse
          paragraphs={[
            "Free users can preview NSAA 2016 and 2017 past papers. ESAT CAMP original mocks for Maths 1, Maths 2 and Physics require full access (paid).",
            "A separate free diagnostic calibration test is available for all users. It is not a full 27-question mock, but it helps identify speed and accuracy issues in Maths 1.",
          ]}
        />
        <SeoCtaRow className="mt-6">
          <SeoCta
            href={APP_ROUTES.calibration}
            variant="quiet"
            placement="section"
          >
            Free calibration test
          </SeoCta>
          <SeoCta
            href={APP_ROUTES.pastPaperLibrary}
            variant="quiet"
            placement="section"
          >
            Past papers library
          </SeoCta>
        </SeoCtaRow>
      </SeoSection>

      <SeoSection heading="How to use the mocks">
        <SeoProse
          paragraphs={[
            "Start with the free calibration test to diagnose whether speed or accuracy is your main issue. Then use topic practice to fix specific gaps before attempting full mocks.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Take the free calibration test first to identify weak areas.",
            "Use topic practice to strengthen specific skills.",
            "Attempt a full mock under strict timing (27 questions, 40 minutes).",
            "Review wrong answers and time-per-question data before the next mock.",
            "Leave at least one mock untouched until close to your test date.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Mock structure">
        <ResponsiveTable
          columns={["Feature", "Detail"]}
          rows={[
            ["Questions", "27 per module"],
            ["Time limit", "40 minutes"],
            ["Calculator", "Not permitted"],
            ["Format", "Multiple choice with timing data"],
            ["Scoring", "Raw marks, plus estimated scaled score via converter"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Mocks vs official papers">
        <SeoProse
          paragraphs={[
            "ESAT CAMP mocks are designed to match the specification, timing and difficulty of the real ESAT. For official past-paper practice, use NSAA and ENGAA papers from the past papers library.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Official papers guide:{" "}
          <SeoTextLink href={SEO_ROUTES.pastPapersGuide}>
            Which ESAT past papers to use
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
