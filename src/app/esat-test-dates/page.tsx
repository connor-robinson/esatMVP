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
  InfoCardGrid,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.testDates;

const TITLE = "ESAT Test Dates 2026/27 | October & January Sittings";
const DESCRIPTION =
  "Key ESAT dates for 2027 entry, including booking deadlines, October and January test windows, bursary deadlines and results dates.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT test dates",
    "ESAT 2026 dates",
    "ESAT January 2027",
    "ESAT October 2026",
    "ESAT booking deadline",
    "UAT UK dates",
  ],
});

const KEY_DATES: readonly (readonly string[])[] = [
  ["Account creation", "1 June 2026, 3pm BST", "Already open"],
  ["Booking opens", "20 July 2026, 3pm BST", "26 October 2026, 3pm GMT"],
  [
    "Access arrangements deadline",
    "14 September 2026, 6pm BST",
    "7 December 2026, 6pm GMT",
  ],
  ["Bursary deadline", "21 September 2026, 6pm BST", "14 December 2026, 6pm GMT"],
  ["Booking closes", "28 September 2026, 6pm BST", "21 December 2026, 6pm GMT"],
  ["Test window", "12–16 October 2026", "4–8 January 2027"],
  ["Results released", "16 November 2026", "8 February 2027"],
];

const FAQ: readonly FaqItem[] = [
  {
    question: "Is there a January ESAT sitting?",
    answer:
      "Yes. For 2027 entry, the January sitting is 4–8 January 2027. Standard Oxford and Cambridge applicants normally need the October sitting, except specific mature-college and Foundation Year cases.",
  },
  {
    question: "Can I sit the ESAT twice?",
    answer:
      "No. UAT-UK states that applicants can sit only once within an admissions cycle.",
  },
  {
    question: "When do ESAT results come out?",
    answer:
      "UAT-UK lists 16 November 2026 for the October sitting and 8 February 2027 for the January sitting.",
  },
];

export default function EsatTestDatesPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Key dates"
      title="ESAT Test Dates for 2027 Entry"
      intro={[
        "For 2027 entry, the ESAT runs in two sittings: October 2026 and January 2027. Most Oxford and Cambridge applicants must sit in October. Applicants to other UAT-UK institutions can usually choose either sitting, but you can only sit once in an admissions cycle.",
      ]}
      lastChecked
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start preparation plan" }}
      secondaryCta={{ href: SEO_ROUTES.preparation, label: "Read the prep guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Dates booked. Now build the plan",
        body: "Once the sitting is fixed, the useful question is what to practise between now and then. Calibration gives a starting point based on your actual speed and accuracy rather than a guess.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.preparation, label: "See the preparation order" },
      }}
      related={seoLinks("preparation", "testDay", "calibration", "pastPapers", "testDate")}
      sources={[SOURCES.deadlines, SOURCES.esatTest]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT Test Dates for 2027 Entry",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Key dates at a glance">
        <ResponsiveTable
          columns={["Stage", "October 2026 sitting", "January 2027 sitting"]}
          rows={KEY_DATES}
          caption="All times as published by UAT-UK. Deadlines are hard cut-offs. Booking does not reopen afterwards."
        />
      </SeoSection>

      <SeoSection
        heading="Which sitting should you choose?"
        lead="For most applicants the choice is made by the course, not by preference."
      >
        <InfoCardGrid
          cards={[
            {
              title: "October 2026",
              body: "Required for most Oxford and Cambridge applicants. Usually the best choice if you are ready to prepare over summer, and it gives results earlier in the admissions cycle.",
            },
            {
              title: "January 2027",
              body: "Not normally available for standard Oxford or Cambridge applicants. Available for other UAT-UK institutions where the course allows it, and useful if you are applying later or need more preparation time.",
            },
          ]}
        />
        <HighlightBox className="mt-5" title="The official exceptions">
          <p>
            Cambridge mature-college applicants with a January admissions deadline
            and Oxford Astrophoria Foundation Year applicants are the exceptions
            UAT-UK names for sitting in January. Everything else should be checked
            against your specific course page.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="China, Hong Kong and Macau">
        <SeoProse
          paragraphs={[
            "For China, Hong Kong and Macau, the ESAT is restricted to 12 or 13 October 2026, or 6 January 2027. This is stricter than the wider test window, so candidates in these regions should book early.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What to do after checking dates">
        <SeoList
          items={[
            "Confirm your required modules on the university course pages.",
            "Create your UAT-UK account.",
            "Apply early for access arrangements or a bursary if relevant. Those deadlines fall before booking closes.",
            "Book before the deadline.",
            "Start calibration and build a preparation plan.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
