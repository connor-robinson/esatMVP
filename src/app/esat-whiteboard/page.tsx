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
import { PracticeWhiteboardGraphic } from "@/components/seo/PracticeWhiteboardGraphic";
import {
  HighlightBox,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.whiteboard;

const TITLE =
  "ESAT Whiteboard Rules: What You Get, What to Bring & What to Practise With";
const DESCRIPTION =
  "Find out what rough-working materials you get in the ESAT, whether you can bring your own whiteboard and what to practise with.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT whiteboard",
    "ESAT rough working",
    "ESAT pen and paper",
    "ESAT noteboard",
    "ESAT practice whiteboard",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Can I bring my own pen and paper to the ESAT?",
    answer:
      "No. UAT-UK says the test centre provides rough-work materials. Candidates cannot bring their own pen and paper into the test.",
  },
  {
    question: "What do you get for rough working?",
    answer:
      "An erasable noteboard or whiteboard and pen are provided for rough working.",
  },
  {
    question: "What should I practise with?",
    answer:
      "A simple A4 dry-wipe board is enough. You do not need anything expensive. The point is getting comfortable with limited working space. Practice boards are not identical to every Pearson centre board.",
  },
];

const PRACTICE_LINKS = [
  {
    href: "https://www.diy.com/departments/1x-a4-magnetic-whiteboard-w-pen-eraser/5055709820133_BQ.prd",
    label: "B&Q A4 magnetic whiteboard with pen",
  },
  {
    href: "https://www.ryman.co.uk/office-supplies/whiteboards-and-accessories",
    label: "Ryman whiteboards and accessories",
  },
  {
    href: "https://www.magicwhiteboard.co.uk/",
    label: "Magic Whiteboard reusable dry-erase sheets",
  },
  {
    href: "https://www.staedtler.com/uk/en/products/markers/whiteboard-markers/",
    label: "STAEDTLER dry-wipe marker pens",
  },
] as const;

export default function EsatWhiteboardPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title="ESAT Whiteboard Rules"
      intro={[
        "The ESAT is computer based, so you do not take a notebook in. The test centre provides rough-work materials. You cannot bring your own pen and paper.",
      ]}
      lastChecked
      primaryCta={{ href: SEO_ROUTES.testDay, label: "Test-day guide" }}
      secondaryCta={{
        href: SEO_ROUTES.noCalcPractice,
        label: "No-calculator practice",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practise compact working, not a perfect replica board",
        body: "Get used to writing small, wiping quickly and keeping diagrams tight. Then practise the same no-calculator speed you will need on the day.",
        primary: { href: SEO_ROUTES.preparation, label: "Preparation guide" },
        secondary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
      }}
      related={seoLinks(
        "testDay",
        "noCalcPractice",
        "preparation",
        "esatBreaks",
        "calculatorRules",
      )}
      sources={[SOURCES.roughWorkings, SOURCES.testDayOfficial, SOURCES.candidateHandbook]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT Whiteboard Rules",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="The rules">
        <SeoProse
          paragraphs={[
            "Personal pen and paper are not allowed. If the board or pen at the centre is not working, raise your hand and ask the invigilator to replace it.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What you receive">
        <SeoProse
          paragraphs={[
            "An erasable noteboard / whiteboard and pen are provided for rough working.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What you cannot bring">
        <HighlightBox title="Leave your own board at home">
          <p>
            You cannot bring your own whiteboard, notebook, extra pens or scrap
            paper into the test. Practice kit is for home use only.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="Recommended practice setup">
        <PracticeWhiteboardGraphic />
        <SeoList
          className="mt-6"
          items={[
            "Writing equations quickly",
            "Drawing small diagrams",
            "Keeping working compact",
            "Wiping and restarting quickly",
            "Avoiding filling the whole board",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "A simple A4 dry-wipe board is enough. You do not need anything expensive. The point is getting comfortable with limited working space.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Practice products">
        <SeoProse
          paragraphs={[
            "These are ordinary stationery links for practice only. They are not the materials you can bring into the exam, and they are not identical to every Pearson centre board.",
          ]}
        />
        <ul className="mt-5 space-y-3">
          {PRACTICE_LINKS.map((link) => (
            <li key={link.href} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B82F6]"
              />
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[#3B82F6]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </SeoSection>
    </SeoPageLayout>
  );
}
