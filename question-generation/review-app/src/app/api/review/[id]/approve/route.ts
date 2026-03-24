import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import type { ReviewQuestion } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/review/[id]/approve
 * Marks question as approved with reviewer tracking
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createServerClient();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // Parse request body for is_good_question flag
    let isGoodQuestion = false;
    try {
      const body = await request.json();
      isGoodQuestion = body.is_good_question === true;
    } catch (e) {
      // Body might be empty, that's okay - default to false
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Update question status to approved
    const updates = {
      status: 'approved' as const,
      is_good_question: isGoodQuestion,
    };

    const { data, error } = await supabase
      .from('ai_generated_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Review API] Error approving question:', error);
      return NextResponse.json(
        { error: 'Failed to approve question', details: error.message },
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


