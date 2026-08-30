import type { Metadata } from "next";
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
import {
  HighlightBox,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoSubheading,
  SeoTextLink,
  SummaryBox,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.testDay;
const AUTHOR = FOUNDERS.anson;
const AUTHOR_ID = `${buildCanonicalUrl(ABOUT_PATH)}#${AUTHOR.id}`;

const PAGE_TITLE = "What Our Students Say About ESAT Test Day";
const TITLE = `${PAGE_TITLE} | ESAT CAMP`;
const DESCRIPTION =
  "What ESAT CAMP students experienced on ESAT test day at Pearson VUE: arrival, security, whiteboard booklet, module transitions and water rules.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT test day",
    "ESAT Pearson VUE",
    "ESAT breaks",
    "ESAT whiteboard",
    "ESAT security check",
    "ESAT module transition",
    "ESAT water",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "What ID do I need for the ESAT?",
    answer:
      "I used my passport. Current UAT-UK rules accept specified forms of original, valid photographic government ID, so check the current ID policy rather than assuming you specifically need a passport.",
  },
  {
    question: "Are there lockers at Pearson VUE?",
    answer:
      "There were lockers at the Oxford centre I used. UAT-UK says personal belongings are left outside the testing room, and Pearson's own test-centre documentation shows lockable storage as part of its Professional Center setup.",
  },
  {
    question: "Are you searched before the ESAT?",
    answer:
      "I went through a security scan and had my glasses inspected. Current UAT-UK guidance says candidates may be scanned and will undergo a visual inspection.",
  },
  {
    question: "Is there a break between ESAT modules?",
    answer:
      "There is no scheduled break. In my 2025 sitting there was a short transition countdown before the next module, but that is not the same thing as a normal break. Current UAT-UK guidance explicitly says there are no breaks between modules or papers.",
  },
  {
    question: "Can you take water into the ESAT?",
    answer:
      "Normally, no. Current UAT-UK rules say water is not permitted inside the testing room without prior approval. I had to step outside when I wanted water.",
  },
  {
    question: "What rough paper do you get in the ESAT?",
    answer:
      "I received an A4 reusable booklet with around 10 double-sided sheets, a black marker and wet wipes. Exact centre equipment may differ. UAT-UK officially describes the provided material as an erasable notebook or sheets and a pen.",
  },
];

export default function EsatTestDayPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Test day"
      title={PAGE_TITLE}
      introFullWidth
      intro={[
        "Our students sat the ESAT at Pearson VUE Oxford in 2024 and 2025. The academic part was stressful; the test-centre process itself was fine.",
      ]}
      lastChecked={{
        detail:
          "Official UAT-UK rules below were re-checked on this date. Arrival, security and desk details from my 2025 Oxford sitting may differ by centre or cycle.",
      }}
      primaryCta={{ href: SEO_ROUTES.whiteboard, label: "ESAT whiteboard guide" }}
      secondaryCta={{ href: SEO_ROUTES.testDates, label: "Check the test dates" }}
      faq={FAQ}
      finalCta={{
        heading: "Practise the conditions, not just the content",
        body: "Pacing under a 40-minute clock matters more than memorising the test-centre layout. A timed diagnostic is the quickest way to see whether your pacing plan survives contact with the clock.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: SEO_ROUTES.calculatorRules, label: "Calculator rules" },
      }}
      related={seoLinks(
        "whiteboard",
        "calculatorRules",
        "preparation",
        "testDates",
        "calibration",
      )}
      sources={[
        SOURCES.testDayOfficial,
        SOURCES.accessArrangements,
        SOURCES.roughWorkings,
        SOURCES.waterFaq,
        SOURCES.pearsonProfessionalCenterTour,
        SOURCES.candidateHandbook,
        SOURCES.esatTest,
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
          { name: "ESAT test day", path: PATH },
        ]),
      ]}
    >
      <FirstHandAccount />

      <FounderByline founder="anson" attribution="Written by" className="text-sm text-[#94A3B8]" />

      <HighlightBox title="Between modules">
        <p>
          Use that minute to rest. Do not turn it into another minute of work.
        </p>
      </HighlightBox>

      <SeoSection heading="What happens when you arrive at Pearson VUE?">
        <SeoProse
          paragraphs={[
            "I was pretty nervous when I arrived.",
            "At the counter I used my passport as ID. There were lockers for everything you were not allowed to take into the testing room.",
            "Current UAT-UK guidance says candidates should arrive 30 minutes before their scheduled sitting, present accepted photographic ID and their Pearson appointment confirmation. Personal belongings are then left outside the testing room.",
            "You do not need to bring paper, pens or other exam stationery.",
            "You cannot use them anyway.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Are you searched before the ESAT?">
        <SeoProse
          paragraphs={[
            "Right before entering the testing area, I went through the security process.",
            "I had to go through a security scan and briefly take my glasses off for inspection.",
            "It feels quite serious when you are already nervous, but it was quick.",
            "UAT-UK currently warns that candidates may have to pass through a security scan or security wand and that staff perform a visual inspection before admission to the room.",
            "So do not be surprised by it.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What is the ESAT testing room like?">
        <SeoProse
          paragraphs={[
            "Once inside, everything was good.",
            "I had the computer, the ESAT interface, an A4 erasable booklet, a black marker, wet wipes and earplugs.",
            "Staff monitored candidates from behind the testing area. I did not find it distracting.",
            "Pearson's own Professional Center tour shows the same general setup of testing stations, lockers and a monitored proctor area, although individual centres vary.",
          ]}
        />
        <OfficialExternalImage
          className="mt-6"
          src={PEARSON_OFFICIAL_IMAGES.testingRoom.src}
          alt="Example Pearson Professional Center testing room with partitioned computer workstations"
          title="Example Pearson Professional Center testing room"
          caption="Individual centres vary. This is not a photograph of the Oxford St Aldates room."
          href={PEARSON_OFFICIAL_IMAGES.testingRoom.sourceUrl}
          linkLabel="Open the Pearson Professional Center Tour"
        />
        <SummaryBox
          className="mt-6"
          title="At my desk"
          items={[
            "Computer and ESAT interface",
            "A4 erasable booklet",
            "Black marker",
            "Wet wipes",
            "Earplugs",
          ]}
        />
      </SeoSection>

      <SeoSection heading="You do not have to panic-start">
        <SeoProse
          paragraphs={[
            "One thing I appreciated was that once I was at the computer, I did not feel like somebody was standing over me forcing me to start immediately.",
            "At my sitting, I could settle myself and start when I was ready after reaching the relevant pre-test screens.",
            "So when you sit down, get comfortable.",
            "Check your marker. Put the booklet somewhere sensible. Get the mouse where you want it. Then begin.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="The ESAT whiteboard booklet">
        <SeoProse
          paragraphs={[
            "My booklet was roughly A4 and had around 10 double-sided sheets.",
            "One side was gridded and one side was plain.",
            "I barely used the grid.",
            "The marker was black and fine enough for normal calculations, although the ink could smudge underneath my writing hand. By the end my palm was black.",
            "I was also given wet wipes, presumably for cleaning the booklet.",
            "The important thing is that you do not need to ration the booklet as aggressively as I did.",
            "Current UAT-UK guidance says you can raise your hand and request replacement sheets during your test.",
            "If your marker is bad, ask for another one too.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full first-hand detail:{" "}
          <SeoTextLink href={SEO_ROUTES.whiteboard}>
            what the ESAT whiteboard is actually like
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection id="esat-breaks" heading="Are there breaks during the ESAT?">
        <SeoProse
          paragraphs={[
            "There is no scheduled break between standard ESAT modules. A three-module test is 120 minutes back-to-back. A toilet trip is not a free break unless you have approved pause-the-clock arrangements.",
          ]}
        />
        <ResponsiveTable
          className="mt-6"
          columns={["Question", "Standard sitting"]}
          rows={[
            ["Scheduled module break", "No"],
            ["Standard module length", "40 minutes"],
            ["Three-module testing time", "120 minutes"],
            [
              "Toilet break",
              "Allowed, but the clock generally continues unless approved pause-the-clock arrangements apply",
            ],
            ["Access arrangements", "Arrange in advance through UAT-UK"],
          ]}
        />
        <SeoProse
          className="mt-6"
          paragraphs={[
            "You can raise your hand and ask to use the toilet. Your test time normally continues. Some candidates can receive approved access arrangements, including rest or pause-the-clock arrangements where eligible. These need to be arranged in advance, not on the day.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Use the toilet before entering.",
            "Do a few full-length 120-minute sessions without getting up.",
            "Avoid arriving dehydrated or after a huge meal.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="What happens between ESAT modules?">
        <SeoProse
          paragraphs={[
            "There is no proper scheduled break between standard modules.",
            "UAT-UK explicitly says there are no breaks between modules or papers.",
            "In my 2025 sitting, after finishing a module I reached a screen asking whether I was ready for the next session.",
            "There was a roughly one-minute countdown.",
            "There was also a button to continue early. If I did nothing, the next module would start when the countdown expired.",
            "That minute is more useful than it sounds.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Take your hands off the mouse",
            "Relax your eyes",
            "Breathe",
            "Reset mentally",
            "Forget the previous module",
          ]}
        />
        <HighlightBox className="mt-5" title="What I would not do" tone="warning">
          <p>
            In my 2025 sitting, there was roughly a one-minute transition screen
            between modules. I would use that minute to rest, not to erase
            working. Asking for another booklet is much faster than cleaning
            pages.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="Can you drink water during the ESAT?">
        <SeoProse
          paragraphs={[
            "There was no designated water break.",
            "Water was not sitting next to me during the test. When I wanted water, I had to step outside the testing room.",
            "That matches the current UAT-UK rule that water is not permitted inside the test room without an approved reason.",
            "At my centre, staff were helpful about letting me step outside.",
            "But do not plan your test around getting a nice water break between modules. It is not part of the standard test format.",
            "Use the toilet and drink beforehand.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Is the room distracting?">
        <SeoProse
          paragraphs={[
            "Mine wasn't.",
            "The desk and computer setup were completely fine and the monitoring did not bother me.",
            "I was given earplugs, which were actually useful.",
            "Pearson test centres are designed so candidates can be monitored throughout the examination, and UAT-UK also warns that candidates may be recorded.",
            "After the first few minutes, I stopped thinking about it.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="The five things I wish I knew">
        <div className="space-y-6">
          <div>
            <SeoSubheading>1. Do not bring stationery</SeoSubheading>
            <p className="mt-2 leading-relaxed text-[#94A3B8]">
              Your own paper and pens cannot go into the room. Leave them at
              home.
            </p>
          </div>
          <div>
            <SeoSubheading>2. Check your marker</SeoSubheading>
            <p className="mt-2 leading-relaxed text-[#94A3B8]">
              Do this before starting. If it is faint or running out, ask for
              another one.
            </p>
          </div>
          <div>
            <SeoSubheading>3. Ask for more booklet space</SeoSubheading>
            <p className="mt-2 leading-relaxed text-[#94A3B8]">
              Do not spend valuable time erasing pages just because you think
              you need to preserve the same booklet.
            </p>
          </div>
          <div>
            <SeoSubheading>4. Use the between-module minute to rest</SeoSubheading>
            <p className="mt-2 leading-relaxed text-[#94A3B8]">
              You have just done 40 minutes of intense problem solving. Give
              your brain the minute.
            </p>
          </div>
          <div>
            <SeoSubheading>5. The test centre is not the scary part</SeoSubheading>
            <p className="mt-2 leading-relaxed text-[#94A3B8]">
              I was extremely nervous going in, but once I was at the computer
              the physical setup was completely fine. Most of your preparation
              should still go into doing questions accurately under time
              pressure.
            </p>
          </div>
        </div>
      </SeoSection>

      <CandidateReports />

      <SeoSection heading="Experience note">
        <SeoProse
          paragraphs={[
            "This article combines current UAT-UK rules with first-hand experience from sitting the ESAT at Pearson VUE Oxford in 2025. The experience was also compared informally with friends who sat the test.",
            "This page separates my experience from current UAT-UK rules because individual Pearson VUE centres and future test cycles can differ.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
