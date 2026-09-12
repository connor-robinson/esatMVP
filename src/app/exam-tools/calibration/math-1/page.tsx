import type { Metadata } from "next";
import { Suspense } from "react";
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

const TITLE = "Free ESAT Diagnostic Test | Maths 1 Calibration";
const DESCRIPTION =
  "Take a free ESAT diagnostic test for Maths 1. Spot speed versus accuracy issues, topic weaknesses and what to practise first. Not a full mock.";

export const metadata: Metadata = buildSeoMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "free ESAT diagnostic test",
    "ESAT calibration test",
    "ESAT Maths 1 calibration",
    "ESAT diagnostic",
    "ESAT practice test",
    "ESAT readiness",
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
      "No. It gives one provisional Estimated ESAT score and a skill diagnosis, not an official scaled score. Official scores are released by UAT-UK and depend on the cohort.",
  },
  {
    question: "Do I need an account to take it?",
    answer:
      "You can start without signing in. After you finish, you must sign in or sign up to view your results. Your answers stay saved on this device until you do, and are then also saved to your account.",
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

      <Suspense fallback={null}>
        <CalibrationLandingClient />
      </Suspense>

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
