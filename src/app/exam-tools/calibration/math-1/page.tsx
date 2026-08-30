import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { CalibrationLandingClient } from "./CalibrationLandingClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { AppSeoCta } from "@/components/seo/AppSeoCta";
import {
  AppSeoFaq,
  AppSeoList,
  AppSeoRelatedLinks,
  AppSeoSection,
} from "@/components/seo/AppSeoSection";
import { seoLinks } from "@/lib/seo/links";
import {
  APP_ROUTES,
  buildSeoMetadata,
  faqPageSchema,
  webApplicationSchema,
  type FaqItem,
} from "@/lib/seo/config";

const PATH = APP_ROUTES.calibration;

const TITLE = "ESAT Calibration Test 2026/27 | Find Your Weak Spots";
const DESCRIPTION =
  "Take a free ESAT calibration test to identify your weak skills, speed problems, accuracy issues and recommended practice areas.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "ESAT calibration test",
    "ESAT diagnostic test",
    "ESAT practice test",
    "ESAT readiness",
    "ESAT weaknesses",
  ],
});

const FAQ: readonly FaqItem[] = [
  {
    question: "Is this a full ESAT mock?",
    answer:
      "No. It is a shorter diagnostic designed to reveal what to practise first, so it uses fewer questions than a real 27-question module.",
  },
  {
    question: "Does it predict my official ESAT score?",
    answer:
      "No. It gives a readiness signal and a skill diagnosis, not an official scaled score. Official scores are released by UAT-UK and depend on the cohort.",
  },
  {
    question: "Do I need an account to take it?",
    answer:
      "No. You can take the calibration without signing in, but signing in first means the result and your progress are saved to your account.",
  },
];

export default function Math1CalibrationPage() {
  return (
    <>
      <JsonLd
        schema={[
          webApplicationSchema({
            name: "ESAT Mathematics 1 calibration test",
            description: DESCRIPTION,
            path: PATH,
          }),
          faqPageSchema(FAQ),
        ]}
      />

      <CalibrationLandingClient />

      <Container size="md" className="space-y-5 py-14">
        <AppSeoSection
          heading="What the calibration measures"
          paragraphs={[
            "Find out whether your ESAT bottleneck is speed, accuracy, method selection or topic knowledge. The calibration gives you a clearer starting point than random practice, because it records how long each question takes as well as whether you got it right.",
          ]}
        >
          <AppSeoList
            items={[
              "Accuracy across core Mathematics 1 skills.",
              "Response time per question.",
              "Topic weaknesses.",
              "Your speed versus accuracy profile.",
              "A recommended first practice mode.",
            ]}
          />
        </AppSeoSection>

        <AppSeoSection
          heading="How to use your result"
          paragraphs={[
            "Your calibration result is not a prediction of your final ESAT score. It is a starting map. The most useful result is often quite specific: \u201caccurate but slow on ratios\u201d, or \u201cgood Physics concepts, weak formula rearrangement\u201d.",
          ]}
        >
          <AppSeoList
            ordered
            items={[
              "Complete the recommended first session.",
              "Review errors by type rather than by score.",
              "Practise the weakest skill for five to ten minutes.",
              "Retake calibration after enough practice, not immediately.",
            ]}
          />
          <AppSeoCta
            className="mt-6"
            href={APP_ROUTES.noCalcPractice}
            placement="calibration_outro"
          >
            Open the no-calculator trainer
          </AppSeoCta>
        </AppSeoSection>

        <AppSeoFaq items={FAQ} />

        <AppSeoRelatedLinks
          links={seoLinks("drill", "preparation", "scoreConverter", "maths1")}
        />

        <p className="text-xs leading-relaxed text-text-muted">
          ESATCAMP is an independent preparation resource and is not affiliated
          with or endorsed by UAT-UK, Pearson VUE or any university.
        </p>
      </Container>
    </>
  );
}
