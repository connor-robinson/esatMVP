import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Utility function to check if a position in text is inside $...$ or $$...$$ delimiters
 */
function isPositionInMathDelimiters(text: string, position: number): boolean {
  // Find all display math ($$...$$) blocks
  const displayPattern = /\$\$/g;
  const displayMatches: number[] = [];
  let match;
  
  while ((match = displayPattern.exec(text)) !== null) {
    displayMatches.push(match.index);
  }
  
  // Pair up $$ delimiters
  const displayRanges: Array<[number, number]> = [];
  for (let i = 0; i < displayMatches.length - 1; i += 2) {
    displayRanges.push([displayMatches[i], displayMatches[i + 1] + 2]);
  }
  
  // Check if position is in any display math range
  for (const [start, end] of displayRanges) {
    if (start <= position && position < end) {
      return true;
    }
  }
  
  // Find inline math ($...$) that doesn't overlap with display math
  // We'll manually find $...$ patterns, avoiding those that are part of $$...$$
  let searchIndex = 0;
  while (searchIndex < text.length) {
    const dollarIndex = text.indexOf('$', searchIndex);
    if (dollarIndex === -1) break;
    
    // Check if this is part of a display math block ($$)
    const isDisplayStart = dollarIndex < text.length - 1 && text[dollarIndex + 1] === '$';
    if (isDisplayStart) {
      // Skip to after the display math block
      const displayEnd = text.indexOf('$$', dollarIndex + 2);
      if (displayEnd !== -1) {
        searchIndex = displayEnd + 2;
        continue;
      }
    }
    
    // This is a potential inline math start
    const inlineEnd = text.indexOf('$', dollarIndex + 1);
    if (inlineEnd !== -1) {
      // Check if this is not part of a display math block
      const isPartOfDisplay = displayRanges.some(
        ([dmStart, dmEnd]) => dollarIndex >= dmStart && dollarIndex < dmEnd
      );
      
      if (!isPartOfDisplay) {
        const start = dollarIndex;
        const end = inlineEnd + 1;
        if (start <= position && position < end) {
          return true;
        }
      }
      searchIndex = inlineEnd + 1;
    } else {
      break;
    }
  }
  
  return false;
}

/**
 * Check if text contains \frac{...} that is not wrapped in $ delimiters
 */
function hasFracWithoutDelimiters(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Find all \frac{...}{...} occurrences
  const fracPattern = /\\frac\{[^}]*\}\{[^}]*\}/g;
  let match;
  
  while ((match = fracPattern.exec(text)) !== null) {
    // Check if the start of this \frac is inside math delimiters
    if (!isPositionInMathDelimiters(text, match.index)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Wrap any \frac{...} expressions that are not already in $ delimiters
 * with $ delimiters.
 */
function fixFracFormatting(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  // Find all \frac{...}{...} occurrences
  const fracPattern = /\\frac\{[^}]*\}\{[^}]*\}/g;
  const fracMatches: Array<{ start: number; end: number; content: string }> = [];
  let match;
  
  while ((match = fracPattern.exec(text)) !== null) {
    fracMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[0],
    });
  }
  
  // Process matches in reverse order to maintain correct indices
  let result = text;
  for (let i = fracMatches.length - 1; i >= 0; i--) {
    const { start, end, content } = fracMatches[i];
    
    // Check if this \frac is inside math delimiters
    if (!isPositionInMathDelimiters(result, start)) {
      // Wrap this \frac with $ delimiters
      result = result.slice(0, start) + '$' + content + '$' + result.slice(end);
    }
  }
  
  return result;
}

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

    console.log(`[Fix Fractions] Starting ${dryRun ? 'DRY RUN' : 'FIX'} mode`);

    // Fetch all questions
    let query = supabase
      .from('ai_generated_questions')
      .select('id, options, generation_id, schema_id');

    if (limit) {
      query = query.limit(limit);
    }

    const { data: questions, error: queryError } = await query;

    if (queryError) {
      console.error('[Fix Fractions] Error fetching questions:', queryError);
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

    console.log(`[Fix Fractions] Found ${(questions as any[]).length} questions to check`);

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
          console.warn(`[Fix Fractions] Could not parse options for question ${question.id}`);
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

        if (hasFracWithoutDelimiters(optionValue)) {
          needsFix = true;
          const fixedValue = fixFracFormatting(optionValue);
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

    console.log(`[Fix Fractions] Found ${questionsNeedingFix.length} questions needing fix`);

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
      console.log(`[Fix Fractions] Applying fixes to ${questionsNeedingFix.length} questions...`);

      for (const questionData of questionsNeedingFix) {
        try {
          const { error: updateError } = await (supabase
            .from('ai_generated_questions') as any)
            .update({ options: questionData.updated_options })
            .eq('id', questionData.id);

          if (updateError) {
            console.error(
              `[Fix Fractions] Error updating question ${questionData.generation_id}:`,
              updateError
            );
          }
        } catch (error) {
          console.error(
            `[Fix Fractions] Unexpected error updating question ${questionData.generation_id}:`,
            error
          );
        }
      }

      console.log(`[Fix Fractions] Done! Fixed ${questionsNeedingFix.length} questions`);
    }

    return NextResponse.json({
      ...result,
      message: `Successfully fixed ${questionsNeedingFix.length} questions`,
    });
  } catch (error) {
    console.error('[Fix Fractions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

