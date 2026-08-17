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
  ResponsiveTable,
  SeoProse,
  SeoSection,
  SeoTextLink,
} from "@/components/seo/SeoSections";

const PATH = SEO_ROUTES.goodScore;

const TITLE = "What Is a Good ESAT Score? | The 1.0–9.0 Scale";
const DESCRIPTION =
  "Understand ESAT scores, the 1.0–9.0 scale, module scores and how to use your score estimate to plan preparation.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "what is a good ESAT score",
    "ESAT score",
    "ESAT score converter",
    "ESAT results",
    "ESAT score scale",
    "ESAT raw marks",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is the ESAT scored out of 9?",
    answer:
      "ESAT module results are reported on a 1.0 to 9.0 scale to one decimal place. Each module you sit receives its own score.",
  },
  {
    question: "Does the score converter give an official score?",
    answer:
      "No. It should be treated as an estimate. Official scaled scores depend on the cohort and are released by UAT-UK.",
  },
  {
    question: "Should I focus on my total score?",
    answer:
      "Focus on individual modules and repeated weak skills. Universities receive module scores, and each required module matters.",
  },
];

export default function GoodEsatScorePage() {
  return (
    <SeoPageLayout
      path={PATH}
      eyebrow="Scores"
      title="What Is a Good ESAT Score?"
      intro={[
        "A good ESAT score depends on your course, university, module combination and the strength of the applicant field. There is no single guaranteed score that makes an application safe.",
        "The useful question is not only \u201cwhat score do I need?\u201d It is \u201cwhich module and skill is currently holding my score down?\u201d",
      ]}
      primaryCta={{ href: APP_ROUTES.scoreConverter, label: "Use the score converter" }}
      secondaryCta={{ href: APP_ROUTES.calibration, label: "Start free calibration" }}
      faq={FAQ}
      finalCta={{
        heading: "Turn the estimate into a decision",
        body: "A score estimate is only useful if it changes what you practise. After using the converter, take calibration to identify whether your next improvement should come from speed, accuracy, content or method selection.",
        primary: { href: APP_ROUTES.calibration, label: "Start free calibration" },
        secondary: { href: APP_ROUTES.scoreConverter, label: "Open the score converter" },
      }}
      related={seoLinks("scoreConverter", "calibration", "preparation", "pastPapers")}
      sources={[SOURCES.results, SOURCES.esatTest]}
      showDisclaimer
      schema={articleSchema({
        headline: "What Is a Good ESAT Score?",
        description: DESCRIPTION,
        path: PATH,
      })}
    >
      <SeoSection heading="How ESAT scores are reported">
        <SeoProse
          paragraphs={[
            "UAT-UK reports ESAT results separately for each module on a 1.0 to 9.0 scale to one decimal place. Each module is 27 multiple-choice questions in 40 minutes, one mark per correct answer and no negative marking.",
            "The official sample and specimen tests do not give a scaled score, because the scale depends on the ability distribution of the cohort that sat the paper.",
          ]}
        />
      </SeoSection>

      <SeoSection heading="Why raw marks are hard to interpret">
        <SeoProse
          paragraphs={[
            "The same raw mark may not mean exactly the same thing every year or in every module. Treat any converter, including ours, as an estimate rather than an official result.",
          ]}
        />
        <HighlightBox className="mt-5" title="Estimate only">
          <p>
            Our{" "}
            <SeoTextLink href={APP_ROUTES.scoreConverter}>
              score converter
            </SeoTextLink>{" "}
            maps past-paper raw marks onto the scaled score using published
            conversion data. It is a guide for calibrating expectations against
            mock performance, not a score any university will use.
          </p>
        </HighlightBox>
      </SeoSection>

      <SeoSection
        heading="What to do depending on where you are"
        lead="The number matters less than the action it triggers."
      >
        <ResponsiveTable
          columns={["Situation", "What to do next"]}
          rows={[
            [
              "Low estimate",
              "Find whether the issue is content, speed or accuracy before adding more papers.",
            ],
            [
              "Middle estimate",
              "Improve consistency and reduce repeated error types.",
            ],
            [
              "High estimate",
              "Practise harder mixed sets and protect against careless mistakes.",
            ],
            [
              "Uneven module scores",
              "Spend more time on the weakest required module, not the most enjoyable one.",
            ],
          ]}
        />
      </SeoSection>

      <SeoSection heading="Link the score back to practice">
        <SeoProse
          paragraphs={[
            "A score estimate is only useful if it changes your practice. If one module is weaker, start there. If your score is close to your target but unstable across sets, the problem is usually timing and error rate rather than knowledge.",
          ]}
        />
      </SeoSection>
    </SeoPageLayout>
  );
}
