import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  hasBareLatex,
  wrapBareLatex,
} from "@/lib/utils/fixBareLatexFractions";

export const dynamic = 'force-dynamic';

/**
 * POST /api/questions/fix-fractions
 * Fixes fraction formatting in all question options
 * Query params:
 *   - dryRun: if true, only check and report, don't update
 *   - limit: limit number of questions to process (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;


    // Fetch all questions
    let query = supabase
      .from('ai_generated_questions')
      .select('id, options, generation_id, schema_id');

    if (limit) {
      query = query.limit(limit);
    }

    const { data: questions, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to fetch questions from database' },
        { status: 500 }
      );
    }

    if (!questions || (questions as any[]).length === 0) {
      return NextResponse.json({
        totalQuestions: 0,
        questionsNeedingFix: 0,
        totalOptionsFixed: 0,
        fixedQuestions: [],
      });
    }


    // Check each question
    const questionsNeedingFix: Array<{
      id: string;
      generation_id: string;
      schema_id: string;
      updated_options: Record<string, string>;
      fixedOptions: string[];
    }> = [];
    let totalOptionsFixed = 0;

    for (const question of (questions as any[])) {
      const options = question.options;
      if (!options) {
        continue;
      }

      // Parse options if it's a string
      let parsedOptions: Record<string, string>;
      if (typeof options === 'string') {
        try {
          parsedOptions = JSON.parse(options);
        } catch {
          continue;
        }
      } else {
        parsedOptions = options as Record<string, string>;
      }

      const updatedOptions: Record<string, string> = {};
      const fixedOptions: string[] = [];
      let needsFix = false;

      for (const [optionKey, optionValue] of Object.entries(parsedOptions)) {
        if (typeof optionValue !== 'string') {
          updatedOptions[optionKey] = optionValue as any;
          continue;
        }

        if (hasBareLatex(optionValue)) {
          needsFix = true;
          const fixedValue = wrapBareLatex(optionValue);
          updatedOptions[optionKey] = fixedValue;
          fixedOptions.push(optionKey);
          totalOptionsFixed++;
        } else {
          updatedOptions[optionKey] = optionValue;
        }
      }

      if (needsFix) {
        questionsNeedingFix.push({
          id: question.id,
          generation_id: question.generation_id || 'unknown',
          schema_id: question.schema_id || 'unknown',
          updated_options: updatedOptions,
          fixedOptions,
        });
      }
    }


    const result = {
      totalQuestions: (questions as any[]).length,
      questionsNeedingFix: questionsNeedingFix.length,
      totalOptionsFixed,
      fixedQuestions: questionsNeedingFix.map((q) => ({
        id: q.id,
        generation_id: q.generation_id,
        schema_id: q.schema_id,
        fixedOptions: q.fixedOptions,
      })),
    };

    if (dryRun) {
      return NextResponse.json({
        ...result,
        message: 'This was a dry run. No changes were made to the database.',
      });
    }

    // Apply fixes
    if (questionsNeedingFix.length > 0) {

      for (const questionData of questionsNeedingFix) {
        try {
          const { error: updateError } = await (supabase
            .from('ai_generated_questions') as any)
            .update({ options: questionData.updated_options })
            .eq('id', questionData.id);

          if (updateError) {
          }
        } catch (error) {
        }
      }

    }

    return NextResponse.json({
      ...result,
      message: `Successfully fixed ${questionsNeedingFix.length} questions`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

