import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { computeQuestionStats, MIN_ATTEMPTS_THRESHOLD } from "@/types/questionStats";
import type { QuestionChoiceStatsRow } from "@/lib/supabase/types";
import type { QuestionStats } from "@/types/questionStats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Baseline data constants
 */
const BASELINE_ATTEMPTS = 100;
const BASELINE_AVG_TIME_SECONDS = 90; // 1:30

/**
 * Compute stats with baseline data added
 * Combines real database stats with 100 baseline "average" attempts
 * Baseline distribution: 50% correct answer, remaining 50% split equally among wrong answers
 */
function computeStatsWithBaseline(
  row: QuestionChoiceStatsRow | null,
  questionId: number,
  correctAnswer: string | null,
  availableOptions: string[] = ["A", "B", "C", "D", "E", "F", "G", "H"]
): QuestionStats {
  // Start with baseline data
  const baselineAttempts = BASELINE_ATTEMPTS;
  const baselineTimeSum = baselineAttempts * BASELINE_AVG_TIME_SECONDS;
  
  // Normalize correct answer to uppercase
  const correctAnswerUpper = correctAnswer ? correctAnswer.toUpperCase() : null;
  
  // Initialize option counts with real data
  const optionCounts: Record<string, number> = {
    A: row?.a_count || 0,
    B: row?.b_count || 0,
    C: row?.c_count || 0,
    D: row?.d_count || 0,
    E: row?.e_count || 0,
    F: row?.f_count || 0,
    G: row?.g_count || 0,
    H: row?.h_count || 0,
  };
  
  // Calculate baseline distribution
  if (correctAnswerUpper && availableOptions.includes(correctAnswerUpper)) {
    // 50% of baseline attempts go to correct answer
    const baselineCorrectCount = Math.floor(baselineAttempts * 0.5);
    optionCounts[correctAnswerUpper] = (optionCounts[correctAnswerUpper] || 0) + baselineCorrectCount;
    
    // Remaining 50% split equally among wrong answers
    const remainingAttempts = baselineAttempts - baselineCorrectCount;
    const wrongOptions = availableOptions.filter(opt => opt !== correctAnswerUpper);
    const wrongOptionsCount = wrongOptions.length;
    
    if (wrongOptionsCount > 0) {
      const baselinePerWrongOption = Math.floor(remainingAttempts / wrongOptionsCount);
      const remainder = remainingAttempts % wrongOptionsCount;
      
      // Distribute equally among wrong options
      wrongOptions.forEach((option, index) => {
        optionCounts[option] = (optionCounts[option] || 0) + baselinePerWrongOption;
        // Distribute remainder to first few wrong options
        if (index < remainder) {
          optionCounts[option] = (optionCounts[option] || 0) + 1;
        }
      });
    }
  } else {
    // If no correct answer known, fall back to equal distribution
    const baselinePerOption = Math.floor(baselineAttempts / availableOptions.length);
    const remainder = baselineAttempts % availableOptions.length;
    
    availableOptions.forEach((option, index) => {
      optionCounts[option] = (optionCounts[option] || 0) + baselinePerOption;
      if (index < remainder) {
        optionCounts[option] = (optionCounts[option] || 0) + 1;
      }
    });
  }
  
  // Calculate baseline correct answers (50% of baseline attempts)
  const baselineCorrect = Math.floor(baselineAttempts * 0.5);
  
  // Get real data from database
  const realAttempts = row?.attempts || 0;
  const realTimeSum = row?.time_sum_seconds || 0;
  const realCorrect = row?.correct || 0;
  
  // Combine baseline and real data
  const totalAttempts = baselineAttempts + realAttempts;
  const totalTimeSum = baselineTimeSum + realTimeSum;
  const totalCorrect = baselineCorrect + realCorrect;
  
  // Calculate combined averages
  const avgTimeSeconds = totalAttempts > 0 ? totalTimeSum / totalAttempts : BASELINE_AVG_TIME_SECONDS;
  const correctPercentage = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 50;
  
  // Calculate percentages
  const optionPercentages: Record<string, number> = {};
  for (const [option, count] of Object.entries(optionCounts)) {
    optionPercentages[option] = totalAttempts > 0 ? (count / totalAttempts) * 100 : 0;
  }
  
  return {
    questionId,
    avgTimeSeconds,
    attempts: totalAttempts,
    correctPercentage,
    optionCounts,
    optionPercentages,
    hasSufficientData: true, // Always true now that we have baseline data
  };
}

/**
 * POST /api/papers/questions/stats
 * Fetches community statistics for multiple questions
 * 
 * Body: { questionIds: number[] }
 * Returns: { stats: QuestionStats[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionIds } = body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: "questionIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate all questionIds are numbers
    if (!questionIds.every((id) => typeof id === "number" && id > 0)) {
      return NextResponse.json(
        { error: "All questionIds must be positive numbers" },
        { status: 400 }
      );
    }

    const supabase = createRouteClient();

    // Fetch questions to get answerLetter (to determine available options)
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select("id, answer_letter")
      .in("id", questionIds);

    if (questionsError) {
      console.error("Error fetching questions:", questionsError);
      // Continue anyway, we'll use default options
    }

    // Create a map of question ID to answer letter
    const questionMap = new Map<number, string>();
    (questions || []).forEach((q: any) => {
      if (q.answer_letter) {
        questionMap.set(q.id, q.answer_letter.toUpperCase());
      }
    });

    // Fetch stats for all question IDs
    const { data, error } = await supabase
      .from("question_choice_stats")
      .select("*")
      .in("question_id", questionIds);

    if (error) {
      console.error("Error fetching question stats:", error);
      return NextResponse.json(
        { error: "Failed to fetch statistics" },
        { status: 500 }
      );
    }

    // Create a map for quick lookup
    const statsMap = new Map<number, QuestionChoiceStatsRow>();
    (data as QuestionChoiceStatsRow[] | null)?.forEach((row) => {
      statsMap.set(row.question_id, row);
    });

    // Compute stats with baseline data for all questions
    const result = questionIds.map((questionId: number) => {
      const row = statsMap.get(questionId) || null;
      const correctAnswer = questionMap.get(questionId) || null;
      // Use default options A-H, or could be customized based on question type
      return computeStatsWithBaseline(row, questionId, correctAnswer);
    });

    return NextResponse.json({ stats: result });
  } catch (error) {
    console.error("Unexpected error fetching question stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




