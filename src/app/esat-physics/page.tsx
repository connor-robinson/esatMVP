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
  Expr,
  InfoCardGrid,
  MiniExample,
  ResponsiveTable,
  SeoList,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.physics;

const TITLE = "ESAT Physics Preparation | Syllabus, Topics & Practice";
const DESCRIPTION =
  "Prepare for ESAT Physics with a focused guide to mechanics, electricity, waves, units, graphs, formula choice and timed numerical reasoning.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT Physics",
    "ESAT Physics preparation",
    "ESAT Physics practice",
    "ESAT Physics topics",
    "ESAT Physics questions",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is ESAT Physics mostly calculations?",
    answer:
      "It includes numerical reasoning, but the key skill is choosing the correct model quickly and using units, graphs and proportionality well.",
  },
  {
    question: "Are ENGAA Physics questions useful for ESAT?",
    answer:
      "Yes, especially Section 1. Advanced questions can be useful later, but check the current ESAT specification and the out-of-spec markings on the official papers.",
  },
];

export default function EsatPhysicsPage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Module guide"
      title="ESAT Physics Preparation"
      intro={[
        "ESAT Physics is not just formula recall. The strongest students usually combine concept understanding with fast rearrangement, unit reasoning, graph interpretation and proportional thinking.",
      ]}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start Physics calibration" }}
      secondaryCta={{
        href: SEO_ROUTES.calculatorRules,
        label: "Read the calculator rules",
      }}
      faq={FAQ}
      finalCta={{
        heading: "Separate the concept gaps from the calculation gaps",
        body: "Physics marks are lost in two very different ways: not knowing which relationship applies, or knowing it and being too slow to use it. The fix is different in each case, so it is worth diagnosing before choosing what to practise.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.noCalcPractice, label: "Train no-calculator speed" },
      }}
      related={seoLinks("calculatorRules", "pastPapers", "calibration", "noCalcPractice")}
      sources={[SOURCES.contentSpec, SOURCES.esatTest]}
      schema={articleSchema({
        headline: "ESAT Physics Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection
        heading="What Physics questions test"
        lead="Always check your own course requirements and the current specification for the exact topic list."
      >
        <InfoCardGrid
          columns={3}
          cards={[
            { title: "Mechanics and forces", body: "Motion, equilibrium, moments and Newtonian reasoning." },
            { title: "Energy, power and momentum", body: "Conservation arguments and efficiency." },
            { title: "Electricity and circuits", body: "Series and parallel, resistance, power and potential dividers." },
            { title: "Waves and optics", body: "Wave equations, reflection, refraction and superposition." },
            { title: "Matter, density and pressure", body: "Solids, fluids and pressure relationships." },
            { title: "Thermal physics", body: "Heat transfer, specific heat capacity and changes of state." },
            { title: "Fields and magnetism", body: "Where specified for your module combination." },
            { title: "Radioactivity and nuclear", body: "Where specified: decay, half-life and nuclear equations." },
            { title: "Graphs, units and proportion", body: "Reading gradients and areas, compound units, scaling." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why Physics goes wrong">
        <SeoProse
          paragraphs={[
            "A student can know every formula and still lose time choosing the wrong relationship, converting units too late, or missing a proportional shortcut.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Using the right formula in the wrong form.",
            "Forgetting compound units.",
            "Treating proportionality as direct when it is inverse or squared.",
            "Reading a graph without checking the axes first.",
            "Doing long arithmetic before estimating the answer.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="A worked example">
        <MiniExample
          question="A resistor has constant resistance. If the voltage across it is doubled, what happens to the power dissipated?"
          solution={
            <>
              For constant resistance, <Expr>P = V²/R</Expr>. Doubling <Expr>V</Expr>{" "}
              makes the power four times larger.
            </>
          }
          point="The shortcut is recognising the proportional relationship before calculating. No numbers are needed at all."
        />
      </SeoSection>

      <SeoSection heading="Recommended practice order">
        <ResponsiveTable
          columns={["Stage", "Focus"]}
          rows={[
            ["1", "Formula choice and rearrangement"],
            ["2", "Units and proportional reasoning"],
            ["3", "Mechanics and electricity timed sets"],
            ["4", "Graph and data interpretation"],
            ["5", "Mixed Physics sets under ESAT timing"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Old-paper sources for Physics">
        <SeoProse
          paragraphs={[
            "For Physics, NSAA Physics and ENGAA Section 1 physics-style questions are strong practice sources. ENGAA advanced physics can be useful as stretch practice, but only after checking whether each question is inside the current ESAT specification.",
          ]}
        />
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Note that ENGAA and NSAA share physics questions within the same year.
          See{" "}
          <SeoTextLink href={SEO_ROUTES.engaaNsaaPapers}>
            the verified overlap list
          </SeoTextLink>{" "}
          before working through both.
        </p>
      </SeoSection>
    </SeoPageLayout>
  );
}
