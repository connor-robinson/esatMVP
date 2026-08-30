import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  APP_ROUTES,
  PEARSON_OFFICIAL_IMAGES,
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
import { OfficialExternalImage } from "@/components/seo/OfficialExternalImage";
import { CandidateReports } from "@/components/seo/CandidateReports";
import { FounderByline } from "@/components/seo/FounderByline";
import { FounderTestimony } from "@/components/seo/FounderTestimony";
import {
  NumberedSteps,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.whiteboard;
const AUTHOR = FOUNDERS.anson;
const AUTHOR_ID = `${buildCanonicalUrl(ABOUT_PATH)}#${AUTHOR.id}`;
const EWAN = FOUNDERS.ewan;

const PAGE_TITLE = "What Our Students Say About the ESAT Whiteboard";
const TITLE = `${PAGE_TITLE} | ESAT CAMP`;
const DESCRIPTION =
  "What ESAT CAMP students actually got for rough working at Pearson VUE: A4 booklet, marker smudging, replacements, and what is worth practising.";

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
      "Students who sat at Pearson VUE Oxford reported a reusable A4-sized notebook. Exact materials can vary by centre, so treat this as first-hand experience rather than a guaranteed specification.",
  },
  {
    question: "Is the ESAT whiteboard gridded?",
    answer:
      "ESAT whiteboard booklets have a grid on one side and blank space on the other. Many students ignore the grid and prefer the blank side.",
  },
  {
    question: "Does the ESAT marker smudge?",
    answer:
      "Students reported that it can. The marker behaves more like a wet-erase pen and can leave ink on your writing hand. It is usually more annoying than distracting.",
  },
  {
    question: "Should I buy an ESAT whiteboard to practise?",
    answer:
      "No. A cheap reusable A4 sleeve or dry-erase pocket is enough if you really want to practise writing on a reusable surface.",
  },
];

export default function EsatWhiteboardPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title={PAGE_TITLE}
      introFullWidth
      intro={[
        "Our students sat the ESAT at Pearson VUE Oxford in 2024 and 2025. Instead of pen and paper, they got a reusable A4 booklet, a black marker and wet wipes.",
      ]}
      lastChecked={{
        detail:
          "Official UAT-UK rules below were re-checked on this date. Centre-specific booklet details are from student sittings and may differ by centre or cycle.",
      }}
      primaryCta={{ href: SEO_ROUTES.testDay, label: "ESAT test-day guide" }}
      secondaryCta={{
        href: `${SEO_ROUTES.testDay}#esat-breaks`,
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
        "calculatorRules",
        "preparation",
        "drill",
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
          headline: PAGE_TITLE,
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

      <SeoSection heading="What does the ESAT whiteboard actually look like?">
        <SeoProse
          paragraphs={[
            "Our students sat the ESAT between 2024 and 2025 at Pearson VUE on St Aldates in Oxford.",
            "They have reported that instead of pen and paper, they received a reusable A4 notebook that you could flip through.",
            "Other candidates who sat the ESAT described a broadly similar setup, although the exact materials may vary between Pearson VUE centres.",
            "Officially, UAT-UK only guarantees an erasable notebook or sheets and a pen, so do not assume every centre will use exactly the same booklet.",
          ]}
        />
        <OfficialExternalImage
          className="mt-6"
          src={PEARSON_OFFICIAL_IMAGES.erasableNoteboard.src}
          alt="Pearson VUE erasable noteboard booklet example with marker"
          title="Example of a Pearson VUE erasable booklet"
          caption="Exact materials can vary by test and centre, and this image is not presented as the exact booklet used for every ESAT sitting."
          href={PEARSON_OFFICIAL_IMAGES.erasableNoteboard.sourceUrl}
          linkLabel="View on Pearson VUE"
        />
      </SeoSection>

      <SeoSection heading="Does the ESAT marker smudge?">
        <SeoProse
          paragraphs={[
            "Students reported that the black marker behaved more like a wet-erase pen than a normal whiteboard marker. And beware that it could smudge under palms while working.",
            "One student reported that by the end of their ESAT, the side of their writing hand was black from the marker. It sounds worse than it is. They did not find the smudging particularly distracting. You just have to accept that your working will not stay perfectly clean.",
          ]}
        />
        <FounderTestimony founder="ewan" className="mt-6">
          <p>The wet wipes they gave me could properly clean the booklet.</p>
          <p>
            My advice is to check the marker immediately. Scribble something
            before you begin. If it is faint, drying out or annoying to write
            with, ask for another one. You don&apos;t want to spend 2 hours with
            a bad marker.
          </p>
        </FounderTestimony>
      </SeoSection>

      <SeoSection heading="Can you ask for another ESAT whiteboard?">
        <FounderTestimony founder="ewan">
          <p>
            I used almost a full booklet during one module. During the short
            transition period before my next module, I started wiping the pages
            clean so I could reuse them, but only had a minute which caused me
            to panic a bit.
          </p>
          <p>
            I should simply have raised my hand and asked for another booklet,
            which I did for the rest of the exam. They were very happy to
            accommodate and it was a much more efficient solution.
          </p>
        </FounderTestimony>
        <SeoProse
          className="mt-6"
          paragraphs={[
            "UAT-UK now explicitly says that you can request new sheets at any point during the test. If you are getting close to the end of your booklet, ask for a new booklet.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          More on what happens between modules:{" "}
          <SeoTextLink href={SEO_ROUTES.testDay}>ESAT test day</SeoTextLink>{" "}
          and{" "}
          <SeoTextLink href={`${SEO_ROUTES.testDay}#esat-breaks`}>
            breaks and timing
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="Is the ESAT whiteboard gridded?">
        <SeoProse
          paragraphs={[
            "ESAT whiteboard booklets have a grid on one side and blank space on the other.",
            "Many students reported to have found the grid useless. For equations, mechanics diagrams and quick algebra, empty space is oftentimes better for working. Most students ignored the grid. More important is your handwriting size. Write compactly enough that you can see your own logic quickly.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Should you buy an ESAT whiteboard for practice?">
        <SeoProse
          paragraphs={[
            "No.",
            "There are commercial Pearson-style reusable exam notebooks online that try to recreate the real testing experience. They are useful if you want to see roughly what this kind of booklet looks like, but I do not think buying one purely for ESAT preparation will meaningfully improve your score.",
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
            "Do not obsess over recreating the exact Pearson VUE booklet.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What should you bring?">
        <SeoProse
          paragraphs={[
            "Do not bring your own paper or pens.",
            "UAT-UK does not allow candidates to take their own rough-working materials into the test room. Personal items are stored outside the testing room.",
            "Bring the ID and booking information required for your appointment, but leave your stationery at home.",
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
        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#161D2F]">
            <Image
              src={EWAN.imageSrc}
              alt={EWAN.imageAlt}
              fill
              sizes="40px"
              className="object-cover"
              style={{ objectPosition: EWAN.imagePosition }}
            />
          </div>
          <p className="text-sm text-[#94A3B8]">
            Advice from{" "}
            <Link
              href={`${ABOUT_PATH}#${EWAN.id}`}
              className="font-medium text-[#CBD5E1] transition-colors hover:text-[#3B82F6]"
            >
              {EWAN.name}
            </Link>
          </p>
        </div>
        <NumberedSteps
          steps={[
            "Check the marker before starting.",
            "Ask for another marker immediately if it is poor.",
            "Use both sides of the booklet.",
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
            "You just do not want it to surprise you on test day. Good luck!",
          ]}
        />
      </SeoSection>

      <CandidateReports />

      <SeoSection heading="Experience note">
        <SeoProse
          paragraphs={[
            "This article combines current UAT-UK rules with first-hand experience from sitting the ESAT at Pearson VUE Oxford in 2025. The experience was also compared with ESATCamp students who sat the test.",
            "Test-centre equipment can vary, so current official UAT-UK guidance should always take priority.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
