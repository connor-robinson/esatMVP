import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { normalizeReviewQuestion } from '@/lib/utils';
import type { ReviewQuestion } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/review/[id]/update
 * Updates question fields with edit tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Review API] Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          details: 'Missing Supabase environment variables',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        },
        { status: 500 }
      );
    }

    const supabase = createServerClient();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();
    
    console.log('[Review API] Update request:', {
      id,
      bodyKeys: Object.keys(body),
      hasQuestionStem: 'question_stem' in body,
      hasOptions: 'options' in body,
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
    if (body.options !== undefined) {
      updates.options = body.options;
    }
    if (body.correct_option !== undefined) {
      updates.correct_option = body.correct_option;
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
      updates.difficulty = body.difficulty;
    }
    if (body.paper !== undefined) {
      updates.paper = body.paper;
    }
    if (body.primary_tag !== undefined) {
      updates.primary_tag = body.primary_tag;
    }
    if (body.secondary_tags !== undefined) {
      updates.secondary_tags = body.secondary_tags;
    }

    // Update updated_at and optionally reviewed_by
    updates.updated_at = new Date().toISOString();
    if (userId) {
      updates.reviewed_by = userId;
    }

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
        { status: 500 }
      );
    }

    if (!existingQuestion) {
      console.error('[Review API] Question not found:', id);
      return NextResponse.json(
        { 
          error: 'Question not found',
          details: `No question found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    console.log('[Review API] Question exists, proceeding with update:', {
      id,
      currentStatus: existingQuestion.status,
      updateKeys: Object.keys(updates),
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
        { status: 500 }
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
        { status: 404 }
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
        { status: 404 }
      );
    }

    // Normalize the question to ensure all fields are present and JSONB fields are parsed
    const normalizedQuestion = normalizeReviewQuestion(updatedQuestion);

    // Validate that options is an object (not null)
    if (!normalizedQuestion.options || typeof normalizedQuestion.options !== 'object') {
      console.warn('[Review API] Options is not an object after normalization, setting to empty object');
      normalizedQuestion.options = {};
    }

    console.log('[Review API] Update successful:', { 
      id, 
      updatedFields: Object.keys(updates),
      questionStemPreview: normalizedQuestion.question_stem?.substring(0, 50),
      hasOptions: !!normalizedQuestion.options,
      optionsKeys: Object.keys(normalizedQuestion.options || {}),
    });
    
    return NextResponse.json({ question: normalizedQuestion });
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
      { status: 500 }
    );
  }
}


