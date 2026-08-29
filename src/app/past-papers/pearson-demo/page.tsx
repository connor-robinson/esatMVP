import { PearsonDemoClient } from "@/app/past-papers/pearson-demo/PearsonDemoClient";
import { PEARSON_DEMO_PAPER_ID } from "@/lib/pearson/pearsonDemoConfig";
import { buildNoIndexMetadata } from "@/lib/seo/noIndex";
import { getPastPaperQuestions } from "@/lib/supabase/pastPaperQuestions.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildNoIndexMetadata({
  title: "ESAT player sandbox",
});

export default async function PastPapersPearsonDemoPage() {
  let questions: Awaited<ReturnType<typeof getPastPaperQuestions>> = [];
  try {
    questions = await getPastPaperQuestions(PEARSON_DEMO_PAPER_ID);
  } catch {
    // Client falls back to /api/past-papers/pearson-demo
  }

  return (
    <PearsonDemoClient initialQuestions={questions.length ? questions : undefined} />
  );
}
