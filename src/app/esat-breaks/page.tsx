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
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.esatBreaks;

const TITLE = "Does the ESAT Have Breaks? Toilet Breaks, Timing & Rest Breaks";
const DESCRIPTION =
  "Does the ESAT have a break? Find out about toilet breaks, module timing, rest breaks and access arrangements.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT breaks",
    "ESAT toilet break",
    "ESAT rest breaks",
    "ESAT access arrangements",
    "ESAT timing",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Does the ESAT have a scheduled break?",
    answer:
      "No. There is no scheduled break between standard ESAT modules. The modules are taken back-to-back.",
  },
  {
    question: "Can I go to the toilet during the ESAT?",
    answer:
      "Yes. Raise your hand and tell the invigilator. Your test time normally continues unless you have an approved pause-the-clock arrangement.",
  },
  {
    question: "Can I get rest breaks?",
    answer:
      "Some candidates can receive approved access arrangements, including rest or pause-the-clock arrangements where eligible. These need to be arranged in advance through UAT-UK.",
  },
];

export default function EsatBreaksPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title="Does the ESAT Have Breaks?"
      intro={[
        "There is no scheduled break between modules. A three-module test is 120 minutes back-to-back. A toilet trip is not a free break unless you have approved pause-the-clock arrangements.",
      ]}
      lastChecked
      primaryCta={{ href: SEO_ROUTES.testDay, label: "Full test-day guide" }}
      secondaryCta={{ href: SEO_ROUTES.preparation, label: "Preparation guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Practise the 120-minute sitting, not a break you will not get",
        body: "Do a few full-length sessions without getting up. Use the toilet before you go in. Access arrangements have to be arranged in advance, not on the day.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.whiteboard, label: "Whiteboard rules" },
      }}
      related={seoLinks("testDay", "preparation", "testDate", "whiteboard", "calculatorRules")}
      sources={[
        SOURCES.testDayOfficial,
        SOURCES.accessArrangements,
        SOURCES.cambridgeEsat,
        SOURCES.candidateHandbook,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "Does the ESAT Have Breaks?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="At a glance">
        <ResponsiveTable
          columns={["Question", "Standard sitting"]}
          rows={[
            ["Scheduled module break", "No"],
            ["Standard module length", "40 minutes"],
            ["Three-module testing time", "120 minutes"],
            [
              "Toilet break",
              "Allowed, but the clock generally continues unless approved pause-the-clock arrangements apply",
            ],
            ["Access arrangements", "Arrange in advance"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Can I go to the toilet?">
        <SeoProse
          paragraphs={[
            "Yes. Raise your hand and tell the invigilator. Your test time normally continues.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Can I get rest breaks?">
        <SeoProse
          paragraphs={[
            "Some candidates can receive approved access arrangements, including rest or pause-the-clock arrangements where eligible. These need to be arranged in advance.",
          ]}
        />
        <HighlightBox className="mt-5" title="Check current UAT-UK guidance">
          <p>
            Do not assume you will get extra time or a paused clock unless it
            has already been approved. The current process is on UAT-UK's{" "}
            <SeoTextLink href={SOURCES.accessArrangements.url}>
              access arrangements
            </SeoTextLink>{" "}
            page.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="Practical advice">
        <SeoList
          items={[
            "Use the toilet before entering.",
            "Do a few full-length 120-minute sessions without getting up.",
            "Avoid arriving dehydrated or after a huge meal.",
            "Make the whole sitting feel routine.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More test-day detail:{" "}
          <SeoTextLink href={SEO_ROUTES.testDay}>what test day is like</SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
