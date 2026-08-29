import { NextResponse } from "next/server";
import {
  PEARSON_DEMO_PAPER,
  PEARSON_DEMO_PAPER_ID,
} from "@/lib/pearson/pearsonDemoConfig";
import { getPastPaperQuestions } from "@/lib/supabase/pastPaperQuestions.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const questions = await getPastPaperQuestions(PEARSON_DEMO_PAPER_ID);
    return NextResponse.json({
      paperId: PEARSON_DEMO_PAPER_ID,
      examTitle: PEARSON_DEMO_PAPER.examTitle,
      count: questions.length,
      questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
