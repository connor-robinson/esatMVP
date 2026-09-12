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

const PATH = SEO_ROUTES.chemistry;

const TITLE = "ESAT Chemistry Preparation | Syllabus, Topics & Practice";
const DESCRIPTION =
  "Prepare for ESAT Chemistry with a focused guide to physical, inorganic and organic topics, timing, question style and practice order.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT Chemistry",
    "ESAT Chemistry preparation",
    "ESAT Chemistry practice",
    "ESAT Chemistry topics",
    "ESAT Chemistry questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT Chemistry mostly calculations?",
    answer:
      "ESAT Chemistry includes both calculations and conceptual reasoning. Strong students combine formula knowledge with quick estimation, mole calculations and proportional thinking.",
  },
  {
    question: "Are NSAA Chemistry questions useful for ESAT?",
    answer:
      "Yes. NSAA Section 1 Part B Chemistry questions are a strong practice source, but watch for overlap with ENGAA questions from the same year.",
  },
];

export default function EsatChemistryPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Module guide"
      title="ESAT Chemistry Preparation"
      intro={[
        "ESAT Chemistry tests physical, inorganic and organic chemistry reasoning under pressure. The strongest preparation combines topic knowledge with fast calculation, mole reasoning and proportional shortcuts.",
      ]}
      primaryCta={{ href: questionBankSubjectHref("Chemistry"), label: "Start Chemistry practice" }}
      secondaryCta={{
        href: APP_ROUTES.calibration,
        label: "Free calibration test",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Practice chemistry by topic",
        body: "The question bank includes topic-focused Chemistry practice. Start with 10 free questions to identify weak areas, then unlock full access for comprehensive coverage.",
        primary: { href: questionBankSubjectHref("Chemistry"), label: "Chemistry question bank" },
        secondary: { href: SEO_ROUTES.pastPapers, label: "Past papers" },
      }}
      related={seoLinks("physics", "biology", "maths1", "questionBank", "pastPapers")}
      sources={[SOURCES.contentSpec, SOURCES.esatGuideChemistry, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Chemistry Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What Chemistry questions test"
        lead="Always check your own course requirements and the current specification for the exact topic list."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            { title: "Atomic structure", body: "Electrons, orbitals, periodicity and bonding." },
            { title: "Stoichiometry and moles", body: "Mole calculations, concentrations and limiting reagents." },
            { title: "Energetics", body: "Enthalpy, bond energies and Hess cycles." },
            { title: "Kinetics and equilibria", body: "Rates, Le Chatelier, Kc and dynamic equilibrium." },
            { title: "Acids and bases", body: "pH, titrations, buffers and salt hydrolysis." },
            { title: "Redox and electrochemistry", body: "Oxidation states, half-equations and electrochemical cells." },
            { title: "Organic chemistry", body: "Nomenclature, functional groups, mechanisms and reactions." },
            { title: "Practical reasoning", body: "Data interpretation, graph analysis and experimental design." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why Chemistry goes wrong">
        <SeoProse
          paragraphs={[
            "Students often know the content but lose time on slow mole calculations, forgotten formula rearrangements, or missing proportional shortcuts. The timing rewards fast, accurate method selection.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Forgetting to convert units before calculating.",
            "Using long methods for mole ratios instead of proportional reasoning.",
            "Missing structural hints in organic questions.",
            "Reading graphs or tables without checking labels and units first.",
            "Doing arithmetic before estimating the answer.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="A worked example">
        <MiniExample
          question="A reaction releases 200 kJ per mole. If 0.25 moles react, how much energy is released?"
          solution="Direct proportion: 0.25 × 200 kJ = 50 kJ. No full calculation needed."
          point="The content is simple. The skill is recognising the fastest method before writing anything down."
        />
      </SeoSection>

      <SeoSection heading="Recommended practice order">
        <ResponsiveTable
          columns={["Stage", "Focus"]}
          rows={[
            ["1", "Mole calculations and stoichiometry"],
            ["2", "Energetics and equilibria"],
            ["3", "Acids, bases and redox"],
            ["4", "Organic mechanisms and functional groups"],
            ["5", "Mixed timed Chemistry sets"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Old papers for Chemistry">
        <SeoProse
          paragraphs={[
            "For Chemistry practice, use NSAA Section 1 Part B Chemistry questions and ENGAA chemistry questions where available. Avoid double-counting questions that appear in both papers from the same year.",
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
