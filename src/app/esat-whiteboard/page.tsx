import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  breadcrumbSchema,
  buildCanonicalUrl,
  buildSeoMetadata,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { ABOUT_PATH, FOUNDERS } from "@/config/founders";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import { FirstHandAccount } from "@/components/seo/FirstHandAccount";
import { OfficialSourceCard } from "@/components/seo/OfficialSourceCard";
import { CandidateReports } from "@/components/seo/CandidateReports";
import { FounderByline } from "@/components/seo/FounderByline";
import {
  HighlightBox,
  NumberedSteps,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.whiteboard;
const AUTHOR = FOUNDERS.anson;
const AUTHOR_ID = `${buildCanonicalUrl(ABOUT_PATH)}#${AUTHOR.id}`;

const TITLE = "What Is the ESAT Whiteboard Actually Like? | First-Hand 2025";
const DESCRIPTION =
  "What the ESAT erasable booklet is actually like at Pearson VUE: size, grid, marker smudging, replacements, and what is worth practising with.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT whiteboard",
    "ESAT rough working",
    "ESAT erasable booklet",
    "ESAT marker",
    "ESAT noteboard",
    "Pearson VUE whiteboard",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Can I bring paper into the ESAT?",
    answer:
      "No. UAT-UK says you are provided with erasable sheets or a whiteboard and a pen at the Pearson VUE centre. You cannot take your own rough-working materials into the test.",
  },
  {
    question: "Can I ask for another ESAT whiteboard?",
    answer:
      "Yes. UAT-UK currently says you can request new sheets during the test by raising your hand.",
  },
  {
    question: "What size is the ESAT whiteboard?",
    answer:
      "The booklet I received at Pearson VUE Oxford in 2025 was roughly A4-sized. This is my first-hand experience, not a guaranteed specification for every Pearson VUE centre.",
  },
  {
    question: "Is the ESAT whiteboard gridded?",
    answer:
      "Mine had a gridded side and a blank side. I personally ignored the grid and preferred the blank side.",
  },
  {
    question: "Does the ESAT marker smudge?",
    answer:
      "Mine did. By the end of the test I had black ink along my palm. It did not cause me any serious problems, but it is worth knowing in advance.",
  },
  {
    question: "Should I buy an ESAT whiteboard to practise?",
    answer:
      "I don't think so. A cheap reusable A4 sleeve or dry-erase pocket is enough if you really want to practise writing on a reusable surface.",
  },
];

export default function EsatWhiteboardPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title="What Is the ESAT Whiteboard Actually Like?"
      intro={[
        "The ESAT does not give you normal pen and paper for rough working. At my Pearson VUE centre in Oxford in 2025, I was given an A4 erasable booklet, a black marker, wet wipes and earplugs.",
        "The booklet had roughly 10 double-sided sheets. On mine, one side was gridded and the other was blank.",
        "Do not waste time cleaning your booklet. If you are running out of space, ask for a new one.",
      ]}
      lastChecked={{
        detail:
          "Official UAT-UK rules below were re-checked on this date. Centre-specific booklet details are from my 2025 sitting and may differ by centre or cycle.",
      }}
      primaryCta={{ href: SEO_ROUTES.testDay, label: "ESAT test-day guide" }}
      secondaryCta={{
        href: SEO_ROUTES.esatBreaks,
        label: "Breaks and timing",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practise the maths, not the stationery",
        body: "Get comfortable writing compactly on a reusable surface if you want. Then spend your time on timed no-calculator questions.",
        primary: { href: SEO_ROUTES.preparation, label: "Preparation guide" },
        secondary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
      }}
      related={seoLinks(
        "testDay",
        "esatBreaks",
        "calculatorRules",
        "preparation",
        "noCalcPractice",
      )}
      sources={[
        SOURCES.roughWorkings,
        SOURCES.testDayOfficial,
        SOURCES.waterFaq,
        SOURCES.pearsonErasableNoteboardExample,
        SOURCES.pearsonProfessionalCenterTour,
        SOURCES.candidateHandbook,
      ]}
      showDisclaimer
      schema={[
        articleSchema({
          headline: "What Is the ESAT Whiteboard Actually Like?",
          description: DESCRIPTION,
          path: PATH,
          authorPersonId: AUTHOR_ID,
          authorName: AUTHOR.name,
        }),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "ESAT whiteboard", path: PATH },
        ]),
      ]}
    >
      <FirstHandAccount />

      <FounderByline founder="anson" attribution="Written by" className="text-sm text-[#94A3B8]" />

      <HighlightBox title="The practical point">
        <p>
          Do not waste time cleaning your booklet. If you are running out of
          space, ask for a new one.
        </p>
      </HighlightBox>

      <SeoSection heading="What does the ESAT whiteboard actually look like?">
        <SeoProse
          paragraphs={[
            "I sat the ESAT in 2025 at Pearson VUE on St Aldates in Oxford.",
            "Mine was not a single little whiteboard. It was more like a reusable A4 notebook that you could flip through.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Around 10 double-sided writable sheets",
            "A grid on one side",
            "A plain white side",
            "A fine black marker",
            "Wet wipes for cleaning it",
            "Earplugs",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Other friends who sat the ESAT described a broadly similar setup, although the exact materials may vary between Pearson VUE centres.",
            "Officially, UAT-UK only guarantees an erasable notebook or sheets and a pen, so do not assume every centre will use exactly the same booklet I had.",
          ]}
        />
        <OfficialSourceCard
          className="mt-6"
          title="Example of a Pearson VUE erasable booklet"
          description="Exact materials can vary by test and centre, and this linked Pearson page is not presented as the exact booklet used for every ESAT sitting. It is an official example of the kind of erasable noteboard Pearson centres use."
          href={SOURCES.pearsonErasableNoteboardExample.url}
          linkLabel="View Pearson VUE erasable noteboard example"
        />
      </SeoSection>

      <SeoSection heading="Does the ESAT marker smudge?">
        <SeoProse
          paragraphs={[
            "This was probably the strangest part.",
            "The black marker I had behaved much more like a wet-erase pen than a normal school whiteboard marker. It could smudge under my palm while I was working.",
          ]}
        />
        <HighlightBox className="mt-5" title="From my sitting" tone="neutral">
          <p>
            By the end of my ESAT, the side of my writing hand was black from the
            marker. It looked worse than it actually was.
          </p>
        </HighlightBox>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "It sounds worse than it is. I did not find the smudging particularly distracting. You just have to accept that your working will not stay perfectly clean.",
            "The wet wipes they gave me could properly clean the booklet.",
            "My advice is to check the marker immediately. Scribble something before you begin. If it is faint, drying out or annoying to write with, ask for another one.",
            "Do not spend a 40-minute ESAT module fighting a bad marker.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Can you ask for another ESAT whiteboard?">
        <SeoProse
          paragraphs={[
            "I used almost an entire booklet during one module.",
            "During the short transition before my next module, I started frantically wiping the pages clean so I could reuse them.",
            "That was pointless.",
            "I should simply have raised my hand and asked for another booklet.",
            "UAT-UK now explicitly says that you can request new sheets at any point during the test.",
            "If you are getting close to the end of your booklet, ask early. Do not wait until you literally have nowhere left to write.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More on what happens between modules:{" "}
          <SeoTextLink href={SEO_ROUTES.testDay}>ESAT test day</SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={SEO_ROUTES.esatBreaks}>breaks and timing</SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Is the ESAT whiteboard gridded?">
        <SeoProse
          paragraphs={[
            "Mine had a grid on one side and blank space on the other.",
            "Personally, I found the grid useless.",
            "For equations, mechanics diagrams and quick algebra, I just wanted empty space. I mostly ignored the grid.",
            "More important is your handwriting size.",
            "Do not write enormous equations and burn through half a page per question. But do not force yourself to write microscopically either.",
            "Write compactly enough that you can see your own logic quickly.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Should you buy an ESAT whiteboard for practice?">
        <SeoProse
          paragraphs={[
            "I wouldn't.",
            "There are commercial Pearson-style reusable exam notebooks online that try to recreate the real testing experience. They are useful if you want to see roughly what this kind of booklet looks like, but I do not think buying one purely for ESAT preparation will meaningfully improve your score.",
            "You are practising physics and maths, not plastic stationery.",
            "If you really want to practise the surface, a cheap A4 dry-erase pocket with normal paper inside and a marker is more than enough.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Writing equations without normal pen and paper",
            "Keeping working compact",
            "Drawing quick diagrams",
            "Dealing with a slightly awkward writing surface",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "Do not obsess over recreating the exact Pearson VUE booklet. These product examples are not official ESAT materials and are not endorsed by UAT-UK, Pearson VUE or ESAT CAMP.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What should you bring?">
        <SeoProse
          paragraphs={[
            "Do not bring your own paper or pens expecting to use them.",
            "UAT-UK does not allow candidates to take their own rough-working materials into the test room. Personal items are stored outside the testing room.",
            "Bring the ID and booking information required for your appointment, but leave your ESAT stationery at home.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Related:{" "}
          <SeoTextLink href={SEO_ROUTES.calculatorRules}>
            calculator rules
          </SeoTextLink>{" "}
          and the{" "}
          <SeoTextLink href={SEO_ROUTES.preparation}>
            ESAT preparation guide
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="What I would do if I sat the ESAT again">
        <NumberedSteps
          steps={[
            "Check the marker before starting.",
            "Ask for another marker immediately if it is poor.",
            "Use the blank side of the booklet.",
            "Keep working fairly compact.",
            "Ask for a replacement booklet before I run out.",
            "Never waste the between-module transition cleaning pages.",
            "Ignore a bit of smudging and keep working.",
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "The whiteboard is not something you need to train for extensively.",
            "You just do not want it to surprise you on test day.",
          ]}
        />
      </SeoSection>

      <CandidateReports />

      <SeoSection heading="Experience note">
        <SeoProse
          paragraphs={[
            "This article combines current UAT-UK rules with first-hand experience from sitting the ESAT at Pearson VUE Oxford in 2025. The experience was also compared informally with friends who sat the test.",
            "Test-centre equipment can vary, so current official UAT-UK guidance should always take priority.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
