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
  SeoSubheading,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.maths2;

const TITLE = "ESAT Maths 2 Preparation | Syllabus, Topics & Practice";
const DESCRIPTION =
  "Prepare for ESAT Mathematics 2 with a focused plan for algebra, functions, trigonometry, sequences, logs, calculus and timed problem solving.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT Maths 2",
    "ESAT Mathematics 2",
    "ESAT Maths 2 topics",
    "ESAT Maths 2 practice",
    "TMUA for ESAT Maths 2",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Should I do TMUA for ESAT Maths 2?",
    answer:
      "TMUA Paper 1 can help, especially for algebraic problem solving. Use it as enrichment, not as a replacement for ESAT-style timed practice.",
  },
  {
    question: "Is Maths 2 just harder Maths 1?",
    answer:
      "No. It assumes Maths 1 fluency and adds more advanced mathematical ideas, especially functions, graphs, trigonometry, sequences, logs and calculus.",
  },
];

export default function EsatMaths2Page() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Module guide"
      title="ESAT Maths 2 Preparation"
      intro={[
        "Maths 2 is for applicants whose course requires stronger mathematical problem solving. It builds on Maths 1 and adds more advanced algebra, functions, coordinate geometry, trigonometry, sequences, exponentials, logarithms and calculus-style reasoning.",
      ]}
      primaryCta={{ href: APP_ROUTES.calibration, label: "Start Maths 2 calibration" }}
      secondaryCta={{ href: SEO_ROUTES.maths1, label: "Check Maths 1 first" }}
      faq={FAQ}
      finalCta={{
        heading: "Fix the algebra speed before adding harder topics",
        body: "Most Maths 2 timing problems trace back to manipulation that is slower than it needs to be. Calibrate first, then choose between algebra drills and topic work rather than doing both at half strength.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.questionBank, label: "Open the question bank" },
      }}
      related={seoLinks("maths1", "tmuaForEsat", "pastPapers", "calibration")}
      sources={[SOURCES.contentSpec, SOURCES.tmuaTest]}
      schema={articleSchema({
        headline: "ESAT Maths 2 Preparation",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="What Maths 2 tests">
        <InfoCardGrid
          columns={4}
          cards={[
            { title: "Algebra and functions", body: "Manipulation, composite and inverse functions, domains." },
            { title: "Coordinate geometry", body: "Lines, circles, intersections and geometric reasoning." },
            { title: "Trigonometry", body: "Identities, equations and triangle relationships." },
            { title: "Exponentials and logs", body: "Laws, equation solving and growth or decay models." },
            { title: "Sequences and series", body: "Arithmetic, geometric, sums and limiting behaviour." },
            { title: "Differentiation and integration", body: "Rates, stationary points, areas and standard results." },
            { title: "Graph interpretation", body: "Transformations, asymptotes and recognising shape from form." },
            { title: "Multi-step reasoning", body: "Questions that chain two or three ideas together." },
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why Maths 2 feels harder than Maths 1">
        <SeoProse
          paragraphs={[
            "Maths 2 questions often punish slow algebra. You may know the idea, but if simplifying, rearranging or recognising the graph takes too long, the whole module becomes difficult.",
          ]}
        />
        <SeoList
          className="mt-6"
          items={[
            "Choosing a method too late, after committing to a long route.",
            "Doing unnecessary expansion instead of factorising or substituting.",
            "Forgetting domain and range restrictions.",
            "Losing constants in calculus.",
            "Not recognising standard graph transformations.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="How TMUA helps Maths 2">
        <SeoProse
          paragraphs={[
            "TMUA Paper 1 is useful enrichment because it trains unfamiliar mathematical problem solving without a calculator. It should not replace ESAT practice, but it can make Maths 2 feel less surprising.",
          ]}
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <SeoSubheading>Use TMUA when</SeoSubheading>
            <SeoList
              className="mt-4"
              items={[
                "Your Maths 1 basics are secure.",
                "You want harder algebraic problem solving.",
                "You need more high-quality unseen questions.",
              ]}
            />
          </div>
          <div className="rounded-2xl bg-white/[0.04] p-5">
            <SeoSubheading>Use it carefully</SeoSubheading>
            <SeoList
              className="mt-4"
              items={[
                "Paper 1 maps onto ESAT better than Paper 2.",
                "Paper 2 has logic and proof material that is not an ESAT substitute.",
                "TMUA timing is different, so the score is not an ESAT prediction.",
              ]}
            />
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-[#94A3B8]">
          Full breakdown of where TMUA helps and where it stops:{" "}
          <SeoTextLink href={SEO_ROUTES.tmuaForEsat}>
            TMUA for ESAT preparation
          </SeoTextLink>
          .
        </p>
      </SeoSection>

      <SeoSection heading="A worked example">
        <MiniExample
          question={
            <>
              For <Expr>f(x) = (x − 2)² + 5</Expr>, what is the minimum value of{" "}
              <Expr>f(x + 3)</Expr>?
            </>
          }
          solution={
            <>
              <Expr>f(x)</Expr> has minimum 5, and replacing <Expr>x</Expr> by{" "}
              <Expr>x + 3</Expr> shifts where the minimum occurs, not the minimum
              value. The answer is 5.
            </>
          }
          point="Fast recognition of structure beats expanding. Expanding here costs about a minute and adds two chances to slip."
        />
      </SeoSection>

      <SeoSection heading="Recommended practice order">
        <ResponsiveTable
          columns={["Stage", "Focus"]}
          rows={[
            ["1", "Algebra speed and rearrangement"],
            ["2", "Functions and graphs"],
            ["3", "Trigonometry and coordinate geometry"],
            ["4", "Logs, exponentials and sequences"],
            ["5", "Calculus and mixed hard sets"],
            ["6", "Selected TMUA Paper 1 questions"],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Maths 1 vs Maths 2">
        <ResponsiveTable
          columns={["", "Maths 1", "Maths 2"]}
          rows={[
            ["Who takes it", "All candidates", "Candidates whose course requires it"],
            [
              "Main demand",
              "Core fluency at speed",
              "Advanced manipulation and multi-step reasoning",
            ],
            [
              "Typical failure",
              "Slow arithmetic and careless slips",
              "Method chosen too late, algebra too slow",
            ],
            [
              "Best old-paper source",
              "NSAA Part A Mathematics",
              "ENGAA advanced maths and TMUA Paper 1",
            ],
          ]}
          caption="Both modules are 27 questions in 40 minutes, timed separately, with no calculator."
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
