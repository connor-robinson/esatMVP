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
    const supabase = createServerClient();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;
    const body = await request.json();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Extract updatable fields
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
    if (user) {
      updates.reviewed_by = user.id;
    }

    // Check if question exists
    const { data: existingQuestion, error: checkError } = await supabase
      .from('ai_generated_questions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (checkError) {
      console.error('[Review API] Error checking question:', checkError);
      return NextResponse.json(
        { error: 'Failed to check question', details: checkError.message },
        { status: 500 }
      );
    }

    if (!existingQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Validate that we have at least one field to update
    if (Object.keys(updates).length === 1 && updates.updated_at) {
      console.warn('[Review API] No fields to update');
      // Still proceed to update updated_at timestamp
    }

    // Update the question
    const { data, error } = await supabase
      .from('ai_generated_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Review API] Error updating question:', {
        error,
        id,
        updates: Object.keys(updates),
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
      });
      return NextResponse.json(
        { 
          error: 'Failed to update question', 
          details: error.message,
          code: error.code,
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

    return NextResponse.json({ question: data as ReviewQuestion });
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}


