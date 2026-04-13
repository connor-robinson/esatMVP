import { NextRequest, NextResponse } from 'next/server';
import { getReviewSupabase } from '@/lib/supabaseService';
import { normalizeReviewQuestion } from '@/lib/utils';
import type { ReviewQuestion } from '@/types/review';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const;

/**
 * PATCH /api/review/[id]/update
 * Updates question fields with edit tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabaseUrl = (
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    )?.trim();
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || (!hasAnon && !hasService)) {
      console.error('[Review API] Missing Supabase env:', {
        hasUrl: !!supabaseUrl,
        hasAnon,
        hasService,
      });
      return NextResponse.json(
        {
          error: "Server configuration error",
          details:
            "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const supabase = getReviewSupabase();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();

    console.log('[review-persist] PATCH /update incoming', {
      id,
      bodyKeys: Object.keys(body),
      correct_option_raw: body.correct_option,
      hasQuestionStem: 'question_stem' in body,
      hasOptions: 'options' in body,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    });

    // Get current user session (optional - for logging reviewer)
    let userId: string | null = null;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id || null;
    } catch (authError) {
      console.warn('[Review API] Could not get user session (non-critical):', authError);
      // Continue without user - RLS policies will handle auth requirements
    }

    // Extract updatable fields (matching main app pattern)
    const updates: any = {};
    
    if (body.question_stem !== undefined) {
      updates.question_stem = body.question_stem;
    }
    if (body.question_stem_before_auto_diagram !== undefined) {
      const v = body.question_stem_before_auto_diagram;
      if (v !== null && typeof v !== "string") {
        return NextResponse.json(
          {
            error: "Invalid question_stem_before_auto_diagram",
            details: "Must be a string or null.",
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      updates.question_stem_before_auto_diagram = v === null || v === "" ? null : v;
    }
    if (body.options !== undefined) {
      updates.options = body.options;
    }
    if (body.correct_option !== undefined) {
      const co = String(body.correct_option).trim().toUpperCase();
      if (!/^[A-H]$/.test(co)) {
        console.error('[review-persist] invalid correct_option rejected', {
          id,
          raw: body.correct_option,
          normalized: co,
        });
        return NextResponse.json(
          {
            error: 'Invalid correct_option',
            details: 'Must be a single letter A through H (case-insensitive).',
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      updates.correct_option = co;
    }
    if (body.solution_reasoning !== undefined) {
      updates.solution_reasoning = body.solution_reasoning;
    }
    if (body.solution_key_insight !== undefined) {
      updates.solution_key_insight = body.solution_key_insight;
    }
    if (body.distractor_map !== undefined) {
      updates.distractor_map = body.distractor_map;
    }
    if (body.difficulty !== undefined) {
      const allowed = ['Easy', 'Medium', 'Hard', 'Extreme'] as const;
      if (typeof body.difficulty !== 'string' || !allowed.includes(body.difficulty as (typeof allowed)[number])) {
        return NextResponse.json(
          {
            error: 'Invalid difficulty',
            details: `Must be one of: ${allowed.join(', ')}`,
          },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      updates.difficulty = body.difficulty;
    }
    if (body.subjects !== undefined) {
      updates.subjects = body.subjects;
    }
    if (body.primary_tag !== undefined) {
      updates.primary_tag = body.primary_tag;
    }
    if (body.secondary_tags !== undefined) {
      updates.secondary_tags = body.secondary_tags;
    }

    // Update updated_at
    updates.updated_at = new Date().toISOString();

    // Validate that we have at least one field to update
    if (Object.keys(updates).length === 1 && updates.updated_at) {
      console.warn('[Review API] No fields to update');
      // Still proceed to update updated_at timestamp
    }

    // First, check if the question exists
    const { data: existingQuestion, error: checkError } = await supabase
      .from('ai_generated_questions')
      .select('id, status')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[Review API] Error checking question:', checkError);
      return NextResponse.json(
        { 
          error: 'Failed to check question', 
          details: checkError.message,
          code: checkError.code,
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!existingQuestion) {
      console.error('[Review API] Question not found:', id);
      return NextResponse.json(
        { 
          error: 'Question not found',
          details: `No question found with ID: ${id}`,
        },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    console.log('[review-persist] Supabase update executing', {
      id,
      currentStatus: existingQuestion.status,
      updateKeys: Object.keys(updates),
      correct_option: updates.correct_option,
      hasUserId: !!userId,
    });

    // Update the question and return the updated data in one operation
    // Use .select() (returns array) to match main app pattern
    const { data, error: updateError } = await supabase
      .from('ai_generated_questions')
      .update(updates)
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('[Review API] Supabase error updating question:', {
        error: updateError,
        id,
        updateKeys: Object.keys(updates),
        errorCode: updateError.code,
        errorMessage: updateError.message,
        errorDetails: updateError.details,
        errorHint: updateError.hint,
        // Try to get PostgREST error code
        postgrestCode: (updateError as any).code,
        postgrestMessage: (updateError as any).message,
        // Serialize error with all properties
        fullError: JSON.stringify(updateError, Object.getOwnPropertyNames(updateError), 2),
        hasUserId: !!userId,
        userId: userId,
      });
      
      // Provide more detailed error information
      const errorDetails = updateError.details || updateError.message || 'Unknown database error';
      const errorHint = updateError.hint || '';
      const errorCode = updateError.code || (updateError as any).code || 'UNKNOWN';
      
      return NextResponse.json(
        { 
          error: 'Failed to update question', 
          details: errorDetails,
          code: errorCode,
          hint: errorHint,
          message: updateError.message,
          // Include auth info for debugging
          authInfo: {
            hasUserId: !!userId,
            userId: userId,
          },
        },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!data || data.length === 0) {
      console.error('[Review API] No question found after update - possible RLS issue or ID mismatch:', {
        id,
        questionExists: !!existingQuestion,
        updateKeys: Object.keys(updates),
        dataLength: data?.length || 0,
      });
      
      return NextResponse.json(
        { 
          error: 'Question not found',
          details: `No question found with ID: ${id}. Update may have been blocked by RLS policies.`,
          code: 'NOT_FOUND',
        },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    // Get the first (and should be only) result
    const updatedQuestion = Array.isArray(data) ? data[0] : data;

    if (!updatedQuestion) {
      console.error('[Review API] No question data returned after update');
      return NextResponse.json(
        { 
          error: 'Question not found',
          details: `Update succeeded but no question data was returned`,
          code: 'NO_DATA',
        },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    // Normalize the question to ensure all fields are present and JSONB fields are parsed
    const normalizedQuestion = normalizeReviewQuestion(updatedQuestion);

    // Validate that options is an object (not null)
    if (!normalizedQuestion.options || typeof normalizedQuestion.options !== 'object') {
      console.warn('[Review API] Options is not an object after normalization, setting to empty object');
      normalizedQuestion.options = {};
    }

    console.log('[review-persist] Update successful (RETURNING row)', {
      id,
      updatedFields: Object.keys(updates),
      correct_option: normalizedQuestion.correct_option,
      updated_at: normalizedQuestion.updated_at,
      questionStemPreview: normalizedQuestion.question_stem?.substring(0, 50),
      optionsKeys: Object.keys(normalizedQuestion.options || {}),
    });

    const { data: verifyRow, error: verifyErr } = await supabase
      .from('ai_generated_questions')
      .select('question_stem, correct_option, updated_at')
      .eq('id', id)
      .maybeSingle();
    console.log('[review-persist] PATCH read-after-write SELECT', {
      id,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      verifyErr: verifyErr?.message ?? null,
      correct_option_returning: (updatedQuestion as { correct_option?: string }).correct_option,
      correct_option_select: verifyRow?.correct_option,
      updated_at_select: verifyRow?.updated_at,
      correctMatches:
        verifyRow?.correct_option === (updatedQuestion as { correct_option?: string }).correct_option,
    });
    
    return NextResponse.json(
      { question: normalizedQuestion },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error occurred',
        type: error?.name || 'Error',
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}


