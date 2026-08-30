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
import { EsatOctoberCountdown } from "@/components/seo/EsatOctoberCountdown";
import {
  HighlightBox,
  InfoCardGrid,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.testDates;

const TITLE = "When Is the ESAT 2027? Test Dates, Booking & Deadlines";
const DESCRIPTION =
  "Find the ESAT dates for 2027 entry, including October 2026 and January 2027 test windows, booking deadlines, results dates and test-centre guidance.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT test dates",
    "when is the ESAT",
    "ESAT 2027 dates",
    "ESAT January 2027",
    "ESAT October 2026",
    "ESAT booking deadline",
    "ESAT test centres",
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
    question: "When is the ESAT for 2027 entry?",
    answer:
      "The October sitting is 12–16 October 2026. The January sitting is 4–8 January 2027. Standard Cambridge and Oxford applicants with the 15 October UCAS deadline need the October sitting.",
  },
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
  {
    question: "Can Cambridge or Oxford applicants sit in January?",
    answer:
      "Standard undergraduate applicants with the 15 October deadline must use October. Cambridge mature-college applicants with a January admissions deadline and Oxford Astrophoria Foundation Year applicants are the named exceptions. Check your course page if you think an exception applies.",
  },
  {
    question: "Is there a best time of day for the ESAT?",
    answer:
      "There is no official best ESAT time. Pick the slot when you are normally alert, and do not sacrifice a reliable travel plan for a supposed advantage.",
  },
];

export default function EsatTestDatesPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test dates"
      title="When Is the ESAT 2027? Test Dates, Booking & Deadlines"
      intro={[
        "For 2027 entry, the ESAT runs from 12–16 October 2026 and 4–8 January 2027. Most Oxford and Cambridge applicants must sit in October. Other UAT-UK applicants can usually choose either sitting, but may sit only once in the admissions cycle.",
      ]}
      lastChecked
      faq={FAQ}
      finalCta={{
        heading: "Book early, then build your preparation plan",
        body: "Once your centre and sitting are fixed, focus on the modules you need. Calibration gives you a starting point based on your actual speed and accuracy rather than a guess.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.preparation, label: "See the preparation order" },
      }}
      related={seoLinks(
        "preparation",
        "testDay",
        "universityRequirements",
        "calibration",
        "pastPapers",
        "testDay",
      )}
      sources={[
        SOURCES.deadlines,
        SOURCES.esatTest,
        SOURCES.testCentres,
        SOURCES.cambridgeAppDates,
        SOURCES.oxfordAdmissionsTests,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: TITLE,
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Countdown to the October sitting">
        <EsatOctoberCountdown />
      </SeoSection>

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
              body: "Required for standard Oxford and Cambridge applicants with the 15 October UCAS deadline. It also gives results earlier in the admissions cycle.",
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
            and Oxford Astrophoria Foundation Year applicants are the named exceptions
            for sitting in January. Check your specific university course page before
            booking if you think an exception applies.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="China, Hong Kong and Macau">
        <SeoProse
          paragraphs={[
            "For China, Hong Kong and Macau, the ESAT is restricted to 12 or 13 October 2026, or 6 January 2027. This is stricter than the wider test window, so candidates in these regions should book early.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={["Sitting", "Available dates"]}
          rows={[
            ["October 2026", "12 or 13 October 2026"],
            ["January 2027", "6 January 2027"],
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="Test centres, booking and time of day"
        lead="The ESAT is delivered at Pearson VUE test centres, with appointment availability depending on the centre."
      >
        <InfoCardGrid
          cards={[
            {
              title: "Choosing a test centre",
              body: "Prioritise a reliable route and minimal travel stress. A convenient centre is more useful than a distant appointment that makes test day unpredictable.",
            },
            {
              title: "Choosing a time",
              body: "There is no official best time of day. Pick a slot when you are normally alert and allow enough time for a calm, reliable journey.",
            },
          ]}
        />
        <HighlightBox className="mt-5" title="Book early">
          <p>
            Booking early gives you a better chance of getting your preferred Pearson
            VUE test centre and appointment time. Do not wait for the booking deadline
            if you already know which sitting you need.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="What to do after checking the dates">
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
