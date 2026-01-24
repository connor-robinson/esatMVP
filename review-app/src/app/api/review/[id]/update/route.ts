import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
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

    // Update the question and return the updated data in one operation
    // This matches the pattern used in the main app exactly
    console.log('[Review API] Attempting update:', {
      id,
      updateKeys: Object.keys(updates),
      hasUserId: !!userId,
    });

    // Use the exact same pattern as main app
    const { data, error: updateError } = await supabase
      .from('ai_generated_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

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

    if (!data) {
      console.error('[Review API] No data returned after update');
      return NextResponse.json(
        { error: 'Question was updated but could not be retrieved' },
        { status: 500 }
      );
    }

    // Verify that the update actually persisted by checking key fields
    const updateVerified = Object.keys(updates).every(key => {
      if (key === 'updated_at' || key === 'reviewed_by') return true; // These always change
      const dbValue = data[key as keyof typeof data];
      const expectedValue = updates[key as keyof typeof updates];
      // For JSONB fields, compare stringified versions
      if (typeof dbValue === 'object' && typeof expectedValue === 'object') {
        return JSON.stringify(dbValue) === JSON.stringify(expectedValue);
      }
      return dbValue === expectedValue;
    });

    if (!updateVerified) {
      console.warn('[Review API] Update may not have persisted correctly:', {
        id,
        expected: updates,
        actual: Object.fromEntries(
          Object.keys(updates).map(key => [key, data[key as keyof typeof data]])
        ),
      });
    }

    console.log('[Review API] Update successful:', { 
      id, 
      updatedFields: Object.keys(updates),
      updateVerified,
      questionStemPreview: data.question_stem?.substring(0, 50),
    });
    return NextResponse.json({ question: data as ReviewQuestion });
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


