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
  NumberedSteps,
  ResponsiveTable,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";
import {
  DuplicateWarning,
  OfficialSourceDisclaimer,
  PaperUseGuide,
  PastPaperCTA,
  PastPaperLibrary,
  type PastPaperSection,
} from "@/components/pastPapers";
import { PAST_PAPERS } from "@/content/pastPapers";

const PATH = SEO_ROUTES.pastPapers;

const TITLE = "ESAT Past Papers | Official ENGAA, NSAA and TMUA Paper Library";
const DESCRIPTION =
  "Every official ENGAA, NSAA and TMUA past paper that helps with ESAT preparation, filterable by module, with answer keys and a verified duplicate list.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT past papers",
    "ENGAA past papers",
    "NSAA past papers",
    "TMUA past papers",
    "ESAT practice materials",
    "ESAT past paper answers",
    "ENGAA NSAA overlap",
  ],
});

const OFFICIAL_GUIDES = [
  SOURCES.esatGuideMaths1,
  SOURCES.esatGuideMaths2,
  SOURCES.esatGuidePhysics,
  SOURCES.esatGuideChemistry,
  SOURCES.esatGuideBiology,
];

const SECTIONS: readonly PastPaperSection[] = [
  {
    exam: "ENGAA",
    heading: "ENGAA papers (2016–2023)",
    guide: (
      <PaperUseGuide
        summary={[
          "The closest legacy paper to the ESAT. Part A is Mathematics and Physics; Part B is Advanced Mathematics and Advanced Physics.",
        ]}
        goodFor={[
          "Maths 1 timing and no-calculator fluency.",
          "Physics formula choice and proportional reasoning.",
          "Maths 2 stretch via Part B advanced questions.",
        ]}
        weakFor={[
          "Chemistry and Biology — ENGAA never covered them.",
          "Questions marked outside the ESAT specification.",
        ]}
      />
    ),
  },
  {
    exam: "NSAA",
    heading: "NSAA papers (2016–2023)",
    guide: (
      <PaperUseGuide
        summary={[
          "Split into Mathematics, Physics, Chemistry and Biology. The only public archive covering Chemistry and Biology. Maths and Physics overlap heavily with the same year's ENGAA paper.",
        ]}
        goodFor={[
          "Chemistry and Biology practice.",
          "Maths 1 from Part A.",
          "Physics from Part B.",
        ]}
        weakFor={[
          "Maths 2 — use ENGAA Part B instead.",
          "Fresh practice if you already did that year's ENGAA paper.",
        ]}
      />
    ),
  },
  {
    exam: "TMUA",
    heading: "TMUA papers (2016–2023 and specimen)",
    guide: (
      <PaperUseGuide
        summary={[
          "A separate maths test, not an ESAT paper. The only archive with full worked answers. Paper 1 helps Maths 2; Paper 2 is logic and proof and is less useful.",
        ]}
        goodFor={[
          "Non-calculator algebra, functions and logarithms.",
          "Maths 2 problem solving once fundamentals are secure.",
          "Learning method from the worked answers.",
        ]}
        weakFor={[
          "Physics, Chemistry and Biology.",
          "Timing practice — TMUA allows far longer per question.",
        ]}
      />
    ),
  },
];

const FAQ: readonly FaqItem[] = [
  {
    question: "Are there any real ESAT past papers?",
    answer:
      "No full ESAT past papers are published. UAT-UK provides the ESAT Guide for each module plus the historic ENGAA and NSAA archives, and says those papers contain questions of the type found in the ESAT. That archive is what everyone means by ESAT past papers.",
  },
  {
    question: "Are ENGAA and NSAA papers useful for ESAT?",
    answer:
      "Yes. UAT-UK publishes them as ESAT preparation material and marks where a question falls outside the ESAT specification. ENGAA is the closest match for Maths 1, Maths 2 and Physics; NSAA is the only source for Chemistry and Biology.",
  },
  {
    question: "Should I do both the ENGAA and NSAA paper for the same year?",
    answer:
      "Usually not. We compared the official PDFs and found many questions repeated between the two papers in every year from 2016 to 2023. Pick one paper per year as your practice source and use the other only for the parts it uniquely covers, such as NSAA Chemistry and Biology.",
  },
  {
    question: "Do the papers come with answers?",
    answer:
      "Every ENGAA and NSAA paper has an official answer key, which gives the correct option but not the method. TMUA papers additionally have full worked answers, so they are the best archive for learning how a question should be attacked.",
  },
  {
    question: "Does TMUA help for ESAT?",
    answer:
      "Only for maths, and only as a supplement. TMUA Paper 1 is decent Maths 2 style practice and good non-calculator training. Paper 2 is logic and proof, which is not an ESAT skill. TMUA does not help with Physics, Chemistry or Biology.",
  },
  {
    question: "Can I download the papers from this site?",
    answer:
      "No. We link to the official UAT-UK files rather than hosting copies, so you always get the current version including any updated out-of-spec markings. The papers are the copyright of Cambridge University Press and Assessment.",
  },
];

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Past paper library"
      title="ESAT Past Papers and Practice Materials"
      intro={[
        "There are no published ESAT past papers. Use the official ESAT Guides below, then practise with historic ENGAA, NSAA and TMUA papers from UAT-UK.",
      ]}
      lastChecked={{
        detail:
          "Every link on this page was confirmed to resolve. UAT-UK occasionally reorganises its archive, so the official source pages are listed under each paper.",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Papers measure progress. They do not repair it",
        body: "A paper tells you that ratio questions cost you four marks. It will not fix ratio questions. Spend a short session drilling the specific skill, then spend one of your limited clean papers checking whether it worked.",
        primary: {
          href: APP_ROUTES.noCalcPractice,
          label: "Practise my weak skills",
        },
        secondary: {
          href: APP_ROUTES.calibration,
          label: "Start free calibration",
        },
      }}
      related={seoLinks(
        "engaaNsaaPapers",
        "tmuaForEsat",
        "maths1",
        "maths2",
        "physics",
        "preparation",
      )}
      sources={[
        SOURCES.esatPrepMaterials,
        SOURCES.tmuaPrepMaterials,
        SOURCES.contentSpec,
        SOURCES.esatGuideMaths1,
        SOURCES.esatGuidePhysics,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT Past Papers and Practice Materials",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="1. Official ESAT Guides"
        lead="Read the guide for each module you are sitting before opening any past paper. It describes the current test."
      >
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {OFFICIAL_GUIDES.map((guide) => (
            <li key={guide.url}>
              <a
                href={guide.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.07]"
              >
                {guide.label.replace("UAT-UK — ", "")}
              </a>
            </li>
          ))}
        </ul>
      </SeoSection>

      <SeoSection
        heading="2. Which papers for each module?"
        lead="Pick by the module you are sitting, not by working backwards through the years."
      >
        <ResponsiveTable
          columns={["ESAT module", "Best source", "Second choice", "What to skip"]}
          rows={[
            [
              "Mathematics 1",
              "ENGAA Section 1 Part A maths questions",
              "NSAA Section 1 Part A Mathematics",
              "NSAA copies of questions you already did in ENGAA",
            ],
            [
              "Mathematics 2",
              "ENGAA Section 1 Part B Advanced Mathematics",
              "TMUA Paper 1",
              "TMUA Paper 2 logic and proof questions",
            ],
            [
              "Physics",
              "NSAA Section 1 Part B Physics",
              "ENGAA Part A and Part B physics questions",
              "Questions marked outside the ESAT specification",
            ],
            [
              "Chemistry",
              "NSAA Section 1 Part C Chemistry",
              "No second public source",
              "—",
            ],
            [
              "Biology",
              "NSAA Section 1 Part D Biology",
              "—",
              "Out-of-spec topics flagged in the PDF",
            ],
          ]}
          caption="ENGAA never tested Chemistry or Biology, so NSAA is required if you sit either."
        />
      </SeoSection>

      <SeoSection
        heading="3. ENGAA and NSAA overlap"
        lead="The two archives share many identical questions. Do not treat them as separate banks."
      >
        <DuplicateWarning />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full verified list and which copy to solve:{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers for ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection
        id="library"
        heading="4. Paper library"
        lead="Filter by exam, year, module, relevance or what the paper comes with. All links go to official UAT-UK PDFs."
      >
        <PastPaperLibrary papers={PAST_PAPERS} sections={SECTIONS} />
      </SeoSection>

      <SeoSection heading="5. How to use this archive">
        <NumberedSteps
          steps={[
            "Read the ESAT Guide for each module you are sitting.",
            "Pick one exam per year: ENGAA if you need Maths 2, NSAA if you need Chemistry or Biology.",
            "Work by section, not by whole paper.",
            "Skip anything the PDF marks as outside the ESAT specification.",
            "Check the duplicate list before starting the second paper from a year.",
            "Use TMUA Paper 1 only once Maths 2 fundamentals are secure.",
            "Keep two or three unseen papers for timed mocks in the final fortnight.",
          ]}
        />
      </SeoSection>

      <PastPaperCTA
        heading="Work out which module is costing you marks"
        body="Most people pick papers by year and discover halfway through that the problem was arithmetic speed, not physics. The calibration test takes about twenty minutes and tells you whether speed or accuracy is the thing to fix first."
        primary={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
        secondary={{
          href: SEO_ROUTES.engaaNsaaPapers,
          label: "See the duplicate list",
        }}
        placement="library_calibration"
      />

      <OfficialSourceDisclaimer />
    </SeoPageLayout>
  );
}
