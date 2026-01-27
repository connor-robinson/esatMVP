import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/review/[id]/delete
 * Deletes a question from the database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createServerClient();
    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

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

    // Mark question as deleted (soft delete)
    const { error } = await supabase
      .from('ai_generated_questions')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) {
      console.error('[Review API] Error deleting question:', error);
      return NextResponse.json(
        { error: 'Failed to delete question', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

