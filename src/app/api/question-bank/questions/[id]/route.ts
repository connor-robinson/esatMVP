import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireRouteUser } from '@/lib/supabase/auth';
import type { AiGeneratedQuestionRow } from '@/lib/supabase/types';

/**
 * PATCH /api/question-bank/questions/[id]
 * Updates a question's fields
 * 
 * SECURITY: Requires authentication and respects RLS policies
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require authentication instead of using service role
    const { user, supabase, error: authError } = await requireRouteUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }
    

    // Use authenticated client (respects RLS policies)
    // No longer using service role key
    
    const questionId = params.id;
    const updates = await request.json();


    // Validate that we have updates to make
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    // List of allowed fields to update
    const allowedFields = [
      'question_stem',
      'options',
      'correct_option',
      'solution_reasoning',
      'solution_key_insight',
      'distractor_map',
      'difficulty',
      'status',
      'paper',
      'primary_tag',
      'secondary_tags',
    ];

    // Filter to only allowed fields
    const filteredUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate status value if it's being updated
    if (filteredUpdates.status) {
      const validStatuses = ['pending_review', 'approved', 'rejected', 'needs_revision'];
      
      if (!validStatuses.includes(filteredUpdates.status)) {
        return NextResponse.json(
          { error: `Invalid status "${filteredUpdates.status}". Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // First, check if the question exists (using authenticated client)
    const { data: existingQuestion, error: checkError } = await supabase
      .from('ai_generated_questions')
      .select('id, status, generation_id')
      .eq('id', questionId)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { error: `Error checking question: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (!existingQuestion) {
      return NextResponse.json(
        { error: `Question not found with ID: ${questionId}` },
        { status: 404 }
      );
    }


    // Update the question (RLS policies will control access)
    const { data, error } = await supabase
      .from('ai_generated_questions')
      // @ts-ignore - Supabase type inference issue with table name
      .update(filteredUpdates)
      .eq('id', questionId)
      .select();

    if (error) {
      // RLS policy might block this - that's expected if user doesn't have permission
      if (error.code === '42501' || error.message.includes('permission denied')) {
        return NextResponse.json(
          { error: 'Permission denied - insufficient privileges to update this question' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: `Failed to update question: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }


    // Get the first (and should be only) result
    const updatedQuestion: AiGeneratedQuestionRow | null = Array.isArray(data) ? (data[0] as AiGeneratedQuestionRow) : (data as AiGeneratedQuestionRow);
    
    if (!updatedQuestion) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Parse JSONB fields
    const question: AiGeneratedQuestionRow = {
      ...updatedQuestion,
      options: typeof updatedQuestion.options === 'string' ? JSON.parse(updatedQuestion.options) : updatedQuestion.options,
      distractor_map: updatedQuestion.distractor_map && typeof updatedQuestion.distractor_map === 'string' 
        ? JSON.parse(updatedQuestion.distractor_map) 
        : updatedQuestion.distractor_map,
    };

    return NextResponse.json({ question });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

