import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/question-bank/questions/[id]
 * Updates a question's fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use service role client to bypass RLS for development
    // TODO: Add proper authentication checks before production
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseServiceKey) {
      console.error('[Question Update API] Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const questionId = params.id;
    const updates = await request.json();

    console.log('[Question Update API] ===== START UPDATE =====');
    console.log('[Question Update API] Question ID:', questionId);
    console.log('[Question Update API] Question ID type:', typeof questionId);
    console.log('[Question Update API] Question ID length:', questionId?.length);
    console.log('[Question Update API] Raw updates:', JSON.stringify(updates, null, 2));
    console.log('[Question Update API] Updates keys:', Object.keys(updates));
    console.log('[Question Update API] Updates values:', Object.values(updates));

    // Validate that we have updates to make
    if (!updates || Object.keys(updates).length === 0) {
      console.error('[Question Update API] No updates provided');
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
      console.error('[Question Update API] No valid fields to update');
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate status value if it's being updated
    if (filteredUpdates.status) {
      const validStatuses = ['pending_review', 'approved', 'rejected', 'needs_revision'];
      console.error('[Question Update API] Validating status...');
      console.error('[Question Update API] Received status:', JSON.stringify(filteredUpdates.status));
      console.error('[Question Update API] Status length:', filteredUpdates.status.length);
      console.error('[Question Update API] Status charCodes:', Array.from(filteredUpdates.status as string).map((c: string) => c.charCodeAt(0)));
      console.error('[Question Update API] Valid statuses:', validStatuses);
      console.error('[Question Update API] Includes check:', validStatuses.includes(filteredUpdates.status));
      
      if (!validStatuses.includes(filteredUpdates.status)) {
        console.error('[Question Update API] Invalid status value:', filteredUpdates.status);
        return NextResponse.json(
          { error: `Invalid status "${filteredUpdates.status}". Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
    }

    console.log('[Question Update API] Filtered updates:', filteredUpdates);
    console.log('[Question Update API] Status value being sent:', filteredUpdates.status);
    console.log('[Question Update API] Status value type:', typeof filteredUpdates.status);

    // First, check if the question exists
    const { data: existingQuestion, error: checkError } = await supabase
      .from('ai_generated_questions')
      .select('id, status, generation_id')
      .eq('id', questionId)
      .maybeSingle();

    console.log('[Question Update API] Existing question:', existingQuestion);
    console.log('[Question Update API] Current status:', existingQuestion?.status);
    console.log('[Question Update API] Check error:', checkError);

    if (checkError) {
      console.error('[Question Update API] Error checking question:', checkError);
      return NextResponse.json(
        { error: `Error checking question: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (!existingQuestion) {
      console.error('[Question Update API] Question not found with ID:', questionId);
      return NextResponse.json(
        { error: `Question not found with ID: ${questionId}` },
        { status: 404 }
      );
    }

    console.log('[Question Update API] Question exists, proceeding with update');

    // Update the question
    const { data, error } = await supabase
      .from('ai_generated_questions')
      .update(filteredUpdates)
      .eq('id', questionId)
      .select();

    if (error) {
      console.error('[Question Update API] Supabase error:', error);
      console.error('[Question Update API] Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: `Failed to update question: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.error('[Question Update API] No question found with id:', questionId);
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    console.log('[Question Update API] Successfully updated question:', questionId);

    // Get the first (and should be only) result
    const updatedQuestion = Array.isArray(data) ? data[0] : data;

    // Parse JSONB fields
    const question = {
      ...updatedQuestion,
      options: typeof updatedQuestion.options === 'string' ? JSON.parse(updatedQuestion.options) : updatedQuestion.options,
      distractor_map: updatedQuestion.distractor_map && typeof updatedQuestion.distractor_map === 'string' 
        ? JSON.parse(updatedQuestion.distractor_map) 
        : updatedQuestion.distractor_map,
    };

    return NextResponse.json({ question });
  } catch (error) {
    console.error('[Question Update API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

