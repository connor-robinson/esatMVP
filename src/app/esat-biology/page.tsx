import type { Metadata } from "next";
import {
  APP_ROUTES,
  SEO_ROUTES,
  SOURCES,
  articleSchema,
  buildSeoMetadata,
  questionBankSubjectHref,
  type FaqItem,
} from "@/lib/seo/config";
import { seoLinks } from "@/lib/seo/links";
import { SeoPageLayout } from "@/components/seo/SeoPageLayout";
import {
  InfoCardGrid,
  MiniExample,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.biology;

const TITLE = "ESAT Biology Preparation | Syllabus, Topics & Practice";
const DESCRIPTION =
  "Prepare for ESAT Biology with a focused guide to cells, genetics, physiology, ecology and data interpretation under pressure.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT Biology",
    "ESAT Biology preparation",
    "ESAT Biology practice",
    "ESAT Biology topics",
    "ESAT Biology questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT Biology mostly data interpretation?",
    answer:
      "ESAT Biology includes both data interpretation and conceptual reasoning. Strong students combine topic knowledge with fast graph reading, experimental design and proportional thinking.",
  },
  {
    question: "Are NSAA Biology questions useful for ESAT?",
    answer:
      "Yes. NSAA Section 1 Part B Biology questions are a strong practice source, but watch for overlap with ENGAA questions from the same year.",
  },
];

export default function EsatBiologyPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Module guide"
      title="ESAT Biology Preparation"
      intro={[
        "ESAT Biology tests cells, genetics, physiology, ecology and data handling under pressure. The strongest preparation combines topic knowledge with fast data interpretation and experimental reasoning.",
      ]}
      primaryCta={{ href: questionBankSubjectHref("Biology"), label: "Start Biology practice" }}
      secondaryCta={{
        href: APP_ROUTES.calibration,
        label: "Free calibration test",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practice biology by topic",
        body: "The question bank includes topic-focused Biology practice. Start with 10 free questions to identify weak areas, then unlock full access for comprehensive coverage.",
        primary: { href: questionBankSubjectHref("Biology"), label: "Biology question bank" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "Past papers" },
      }}
      related={seoLinks("physics", "chemistry", "maths1", "questionBank", "pastPapers")}
      sources={[SOURCES.contentSpec, SOURCES.esatGuideBiology, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Biology Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What Biology questions test"
        lead="Always check your own course requirements and the current specification for the exact topic list."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            { title: "Cell structure", body: "Organelles, membranes, transport and cell division." },
            { title: "Genetics", body: "DNA, RNA, protein synthesis, inheritance and variation." },
            { title: "Physiology", body: "Respiration, photosynthesis, homeostasis and nervous control." },
            { title: "Ecology and evolution", body: "Populations, food webs, natural selection and adaptation." },
            { title: "Data interpretation", body: "Graphs, experimental design and statistical reasoning." },
            { title: "Practical skills", body: "Method evaluation, variable control and result analysis." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why Biology goes wrong">
        <SeoProse
          paragraphs={[
            "Students often know the content but lose time on slow graph reading, forgotten process details, or missing the shortcut in data questions. The timing rewards fast, accurate interpretation.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Reading graphs or tables without checking axes and units first.",
            "Missing proportional shortcuts in quantitative questions.",
            "Forgetting key process steps under time pressure.",
            "Not estimating magnitudes before calculating.",
            "Treating experimental design questions like recall instead of reasoning.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="A worked example">
        <MiniExample
          question="A population doubles every 20 minutes. How many times larger is it after 1 hour?"
          solution="1 hour = 3 periods of 20 minutes. Doubling three times gives 2 × 2 × 2 = 8 times larger."
          point="The content is simple. The skill is recognising the pattern before starting long arithmetic."
        />
      </SeoSection>

      <SeoSection heading="Recommended practice order">
        <ResponsiveTable
          columns={["Stage", "Focus"]}
          rows={[
            ["1", "Cell structure and genetics"],
            ["2", "Physiology and metabolic processes"],
            ["3", "Ecology and evolution"],
            ["4", "Data interpretation and experimental design"],
            ["5", "Mixed timed Biology sets"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Old papers for Biology">
        <SeoProse
          paragraphs={[
            "For Biology practice, use NSAA Section 1 Part B Biology questions and ENGAA biology questions where available. Avoid double-counting questions that appear in both papers from the same year.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Which questions overlap:{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            ENGAA and NSAA papers for ESAT
          </SeoTextLink>
          .
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
