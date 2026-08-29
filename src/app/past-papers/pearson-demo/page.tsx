import { PearsonDemoClient } from "@/app/past-papers/pearson-demo/PearsonDemoClient";
import {
  PEARSON_DEMO_PAPER,
  PEARSON_DEMO_PAPER_ID,
} from "@/lib/pearson/pearsonDemoConfig";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { getQuestions } from "@/lib/supabase/questions";

export const metadata = buildNoIndexMetadata({
  title: "ESAT player sandbox",
});

export default async function PastPapersPearsonDemoPage() {
  const questions = await getQuestions(PEARSON_DEMO_PAPER_ID);

  if (!questions.length) {
    return (
      <main style={{ padding: 24, fontFamily: "Tahoma, sans-serif" }}>
        <p>
          No questions loaded for {PEARSON_DEMO_PAPER.examTitle} (paper{" "}
          {PEARSON_DEMO_PAPER_ID}).
        </p>
      </main>
    );
  }

  return <PearsonDemoClient questions={questions} />;
}
