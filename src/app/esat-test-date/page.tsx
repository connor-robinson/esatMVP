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
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.testDate;

const TITLE = "When Is the ESAT 2027? Test Dates, Booking, Time & Test Centres";
const DESCRIPTION =
  "ESAT 2027 dates, booking deadlines, test-centre advice and a live countdown for the October sitting.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "when is the ESAT",
    "ESAT 2027 dates",
    "ESAT October 2026",
    "ESAT test centres",
    "ESAT booking",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "When is the ESAT for 2027 entry?",
    answer:
      "The October sitting is 12 to 16 October 2026. The January sitting is 4 to 8 January 2027. Standard Cambridge and Oxford applicants with the 15 October UCAS deadline need October.",
  },
  {
    question: "Can Cambridge or Oxford applicants sit in January?",
    answer:
      "Standard undergraduate applicants with the 15 October deadline must use October. Cambridge mature January applicants can use January. Check your specific course if you think you are an exception.",
  },
  {
    question: "Is there a best time of day for the ESAT?",
    answer:
      "There is no official best ESAT time. Pick the slot when you are normally alert, and do not sacrifice a reliable travel plan for a supposed advantage.",
  },
];

export default function EsatTestDatePage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test dates"
      title="When Is the ESAT 2027?"
      intro={[
        "The October 2026 ESAT is the main sitting for 2027-entry applicants. If you are applying to Cambridge or Oxford through the normal October UCAS deadline, this is the sitting you need.",
      ]}
      lastChecked
      primaryCta={{ href: SEO_ROUTES.testDates, label: "Full date table" }}
      secondaryCta={{ href: SEO_ROUTES.preparation, label: "Preparation guide" }}
      faq={FAQ}
      finalCta={{
        heading: "Book early, then practise the sitting you actually have",
        body: "Booking early helps with centre and time choice. Once the slot is fixed, the useful work is module practice, not hunting for a magic time of day.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.testDay, label: "Test-day guide" },
      }}
      related={seoLinks(
        "testDates",
        "testDay",
        "preparation",
        "universityRequirements",
        "esatBreaks",
        "whiteboard",
      )}
      sources={[
        SOURCES.deadlines,
        SOURCES.testCentres,
        SOURCES.cambridgeAppDates,
        SOURCES.oxfordAdmissionsTests,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "When Is the ESAT 2027?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="Countdown to the October sitting">
        <EsatOctoberCountdown />
      </SeoSection>

      <SeoSection heading="2027 entry sittings">
        <ResponsiveTable
          columns={["Sitting", "Test window", "Booking opens", "Booking deadline"]}
          rows={[
            [
              "October 2026",
              "12 to 16 October 2026",
              "20 July 2026",
              "28 September 2026, 6pm UK",
            ],
            [
              "January 2027",
              "4 to 8 January 2027",
              "26 October 2026",
              "21 December 2026, 6pm UK",
            ],
          ]}
          minWidthClass="min-w-[44rem]"
          caption="Times as published by UAT-UK. The full bursary, access-arrangement and results dates are on the detailed dates page."
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full calendar:{" "}
          <SeoTextLink href={SEO_ROUTES.testDates}>ESAT test dates</SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="China, Hong Kong and Macau">
        <SeoProse
          paragraphs={[
            "The window is narrower in China, Hong Kong and Macau. Book early.",
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

      <SeoSection heading="Cambridge and Oxford">
        <InfoCardGrid
          cards={[
            {
              title: "Cambridge",
              body: "Normal 15 October deadline applicants must use October. Mature January applicants can use January.",
            },
            {
              title: "Oxford",
              body: "Standard undergraduate applicants with the 15 October deadline must use October.",
            },
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Course-by-course modules:{" "}
          <SeoTextLink href={SEO_ROUTES.universityRequirements}>
            ESAT university requirements
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Time of day">
        <SeoProse
          paragraphs={[
            "There is no official best ESAT time. Pick the time when you are normally alert. Do not sacrifice a reliable travel plan for a supposed advantage.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Test centres">
        <SeoProse
          paragraphs={[
            "The ESAT is delivered at Pearson VUE test centres. Prioritise a reliable route, minimal travel stress and a time that fits your normal routine.",
          ]}
        />
        <HighlightBox className="mt-5" title="Book early">
          <p>
            Booking early gives you a better chance of getting your preferred
            centre and appointment.
          </p>
        </HighlightBox>
      </SeoSection>
    </SeoPageLayout>
  );
}
