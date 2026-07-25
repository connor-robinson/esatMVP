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
  NumberedSteps,
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.pastPapers;

const TITLE = "ESAT Past Papers Guide | ENGAA, NSAA and TMUA Practice Map";
const DESCRIPTION =
  "How to use ENGAA, NSAA and TMUA papers for ESAT preparation, avoid overlap, skip out-of-spec questions and build a smarter practice plan.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT past papers",
    "ENGAA for ESAT",
    "NSAA for ESAT",
    "TMUA for ESAT",
    "ESAT practice papers",
    "ESAT papers",
    "ENGAA NSAA overlap",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Are ENGAA and NSAA papers useful for ESAT?",
    answer:
      "Yes. UAT-UK includes them as preparation materials and says they contain questions of the type found in ESAT. Use them selectively and check the out-of-spec markings.",
  },
  {
    question: "Should I do both ENGAA and NSAA from the same year?",
    answer:
      "Not blindly. There is overlap between the Mathematics and Physics questions, so you may repeat questions without realising.",
  },
  {
    question: "Does TMUA help for ESAT?",
    answer:
      "TMUA Paper 1 can help with Maths 2-style problem solving and mathematical fluency. TMUA Paper 2 is more logic and proof heavy, so use it selectively.",
  },
];

export default function EsatPastPapersPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Past papers"
      title="ESAT Past Papers Guide"
      intro={[
        "There are not many live ESAT past papers available publicly, so most students use official specimen and practice tests plus historic ENGAA and NSAA questions. That is sensible, but only if you avoid two traps: out-of-spec questions and duplicated ENGAA/NSAA overlap.",
      ]}
      lastChecked={{
        detail:
          "Official paper archives and out-of-spec markings can change. Check the UAT-UK preparation materials page for the current versions.",
      }}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Find my weak ESAT skills" }}
      secondaryCta={{
        href: SEO_ROUTES.oldPapers,
        label: "See the old-paper map",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practise the skill, then use the paper as the test",
        body: "Papers measure progress well and repair skills badly. Start with a short diagnostic, fix the specific weakness it finds, then spend your limited supply of clean papers on measuring whether it worked.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: {
          href: APP_ROUTES.pastPaperRoadmap,
          label: "Open the past-paper roadmap",
        },
      }}
      related={seoLinks(
        "oldPapers",
        "maths1",
        "maths2",
        "physics",
        "calibration",
        "preparation",
      )}
      sources={[
        SOURCES.esatPrepMaterials,
        SOURCES.engaa2023,
        SOURCES.nsaa2023,
        SOURCES.contentSpec,
      ]}
      showDisclaimer
      schema={articleSchema({
        headline: "ESAT Past Papers Guide",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="What official resources exist?">
        <SeoProse
          paragraphs={[
            "Start with UAT-UK's ESAT preparation materials. They include the ESAT Guide and the historic ENGAA and NSAA archives, which cover question papers and answer keys from 2016 to 2023.",
            "UAT-UK states that these historic papers contain questions of the type found in ESAT, and that the papers indicate where questions are not in the ESAT specification. That second point matters: the marking is what lets you filter a 2016 paper down to material that still counts.",
          ]}
        />
        <HighlightBox className="mt-5" tone="neutral" title="On copyright">
          <p>
            We do not host the official PDFs. Every paper linked from this site
            goes to the UAT-UK source so you always get the current version,
            including the latest out-of-spec markings.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection
        heading="How ENGAA and NSAA map to ESAT"
        lead="Old papers are not interchangeable. Each section is strong for a specific ESAT module."
      >
        <ResponsiveTable
          columns={["Old resource", "Best ESAT use", "Notes"]}
          rows={[
            [
              "NSAA Section 1 Part A Mathematics",
              "Maths 1 practice",
              "Good for core maths fluency. Many questions overlap with ENGAA in the same year.",
            ],
            [
              "NSAA Section 1 Physics",
              "Physics practice",
              "Useful for mechanics, electricity, waves, units and proportional reasoning.",
            ],
            [
              "NSAA Chemistry / Biology",
              "Chemistry / Biology practice",
              "Useful only for students taking those modules. Check crossed-out and out-of-spec items.",
            ],
            [
              "ENGAA Section 1 Part A Mathematics and Physics",
              "Maths 1 + Physics practice",
              "Often overlaps with NSAA maths and physics questions in the same year.",
            ],
            [
              "ENGAA Section 1 Part B Advanced Mathematics and Advanced Physics",
              "Maths 2 and stretch practice",
              "Use selectively. Skip questions marked outside the ESAT specification.",
            ],
            [
              "TMUA Paper 1",
              "Maths 2 enrichment",
              "Good for mathematical problem solving; not a direct ESAT paper.",
            ],
            [
              "TMUA Paper 2",
              "Selective reasoning practice",
              "Logic and proof-heavy questions are less directly relevant to ESAT.",
            ],
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          The{" "}
          <SeoTextLink href={SEO_ROUTES.oldPapers}>
            ENGAA, NSAA and TMUA guide
          </SeoTextLink>{" "}
          goes through each source in more detail, including where TMUA stops
          being a useful substitute.
        </p>
      </SeoSection>

      <SeoSection heading="The overlap problem">
        <SeoProse
          paragraphs={[
            "ENGAA and NSAA share many Mathematics and Physics questions in the same year. For example, the 2023 sphere-and-cylinder surface-area question appears as ENGAA 2023 Section 1 Q1 and NSAA 2023 Part A Q1. The 2023 spaceship mechanics question appears as ENGAA 2023 Section 1 Q2 and NSAA 2023 Physics Q22.",
            "That means doing both full papers can waste time and make your scores look more stable than they really are, because you may be recognising questions rather than solving fresh ones.",
          ]}
        />
        <HighlightBox
          className="mt-5"
          tone="warning"
          title="Do not double-count repeated questions"
        >
          <p>
            If a question appears in both papers, count it once. Two scores built
            from the same questions is one data point, not two.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection heading="A safer practice order">
        <NumberedSteps
          steps={[
            "Read the ESAT specification or guide for your modules.",
            "Take one official sample or specimen test under timed conditions.",
            "Use NSAA and ENGAA by topic or section, not blindly by full paper.",
            "Skip questions clearly marked outside the ESAT specification.",
            "Avoid duplicate questions within the same year.",
            "Use TMUA Paper 1 after Maths 2 fundamentals are secure.",
            "Save some official-style material for timed mocks close to the exam.",
          ]}
        />
      </SeoSection>

      <SeoSection
        heading="Past-paper selection table"
        lead="Pick the source by the goal you have this week, not by chronological order."
      >
        <ResponsiveTable
          columns={["Goal", "Recommended source", "Time setting", "What to skip"]}
          rows={[
            [
              "Maths 1 baseline",
              "NSAA Section 1 Part A, or ENGAA Section 1 Part A maths questions",
              "90 seconds per question",
              "Duplicates; anything marked out of spec",
            ],
            [
              "Physics baseline",
              "NSAA Physics, or ENGAA Part A physics questions",
              "90 seconds per question",
              "Questions outside the current ESAT Physics spec",
            ],
            [
              "Maths 2 stretch",
              "ENGAA advanced maths, or selected TMUA Paper 1",
              "90–120 seconds per question",
              "Pure logic and proof, or topics not in spec",
            ],
            [
              "Full pressure practice",
              "Mixed 27-question set",
              "40 minutes",
              "Repeated questions you have already seen",
            ],
            [
              "Weak-topic repair",
              "Topic-filtered questions",
              "Untimed first, then timed",
              "Full-paper score obsession",
            ],
          ]}
        />
      </SeoSection>

      <SeoSection heading="A cleaner overlap map is still being built">
        <SeoProse
          paragraphs={[
            "We are building a past-paper map that tags each historic question by ESAT module, topic, difficulty and duplicate status. It is not finished. Until it is, use the official PDFs carefully and check the crossed-out questions yourself.",
            "We would rather say that plainly than publish a \"skip question 14\" list that has not been checked against every current official PDF.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
