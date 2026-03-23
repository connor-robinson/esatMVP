import { NextRequest, NextResponse } from 'next/server';
import { getReviewSupabase } from '@/lib/supabaseService';
import { normalizeReviewQuestion } from '@/lib/utils';
import type { ReviewQuestion, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/**
 * List/card fetch: omit heavy JSONB columns (idea_plan, reports, etc.).
 * Full row when `id=…` or slim omitted.
 *
 * Only include columns that exist on every deployed `ai_generated_questions` schema.
 * Omit:
 * - `graphs`, `solution_graphs` — not applied on all projects; PostgREST errors → 500.
 * - `media_upload_code`, `screen_video_storage_path` — added by
 *   `esat_question_generator/migrations/add_question_media.sql`, not the main Supabase
 *   migration chain; many prod DBs do not have them.
 * - `is_good_question` — from `supabase/migrations/20250203000000_add_is_good_question.sql`;
 *   some production DBs never ran it.
 * Detail fetches use `*` and receive those fields when the columns exist.
 */
const SLIM_QUESTION_COLUMNS =
  'id, generation_id, schema_id, difficulty, status, question_stem, options, correct_option, solution_reasoning, solution_key_insight, distractor_map, subjects, primary_tag, secondary_tags, test_type, created_at, updated_at';

/**
 * Fisher-Yates shuffle algorithm for randomizing array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/review/questions
 * Lists all questions (any status) with optional paper/subject filters and ordering.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getReviewSupabase();
    const { searchParams } = new URL(request.url);

    const paperType = searchParams.get('paperType') as PaperType | null;
    const subjectsParam = searchParams.get('subjects');
    const subjects = subjectsParam ? subjectsParam.split(',').filter(s => s.trim()) : [];
    const questionId = searchParams.get('id') as string | null;
    const limit = parseInt(searchParams.get('limit') || '1', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';
    /** Default newest-first: workspace omits sort and was getting created_at ASC → oldest 500 rows only (new syncs invisible). */
    const sortMode = (searchParams.get('sort') || 'updated_desc').trim();
    const slimRequested =
      searchParams.get('slim') === '1' || searchParams.get('slim') === 'true';
    const selectColumns =
      questionId || !slimRequested ? '*' : SLIM_QUESTION_COLUMNS;

    // Build query
    let query = supabase
      .from('ai_generated_questions')
      .select(selectColumns, { count: 'exact' });

    if (questionId) {
      query = query.eq('id', questionId);
    } else {
      const difficultiesParam = searchParams.get('difficulties');
      const difficulties = difficultiesParam
        ? difficultiesParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const allowedDiff = new Set(['Easy', 'Medium', 'Hard', 'Extreme']);
      const diffFiltered = difficulties.filter((d) => allowedDiff.has(d));

      const statusesParam = searchParams.get('status');
      const statuses = statusesParam
        ? statusesParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const allowedStatus = new Set([
        'pending',
        'pending_review',
        'needs_revision',
        'approved',
        'deleted',
        'rejected',
      ]);
      const statusFiltered = statuses.filter((s) => allowedStatus.has(s));

      const hasVideo = searchParams.get('hasVideo');
      const videoOnly = hasVideo === '1' || hasVideo === 'true';

      if (paperType === 'TMUA') {
        query = query.eq('test_type', 'TMUA');
      } else if (paperType === 'ESAT') {
        query = query.or('test_type.eq.ESAT,test_type.is.null');
      }

      if (subjects.length > 0) {
        query = query.in('subjects', subjects);
      }

      if (diffFiltered.length > 0) {
        query = query.in('difficulty', diffFiltered);
      }

      if (statusFiltered.length > 0) {
        query = query.in('status', statusFiltered);
      } else {
        /* Default: hide soft-deleted unless client passes status=deleted (or multi-status including it). */
        query = query.neq('status', 'deleted');
      }

      if (videoOnly) {
        query = query.not('screen_video_storage_path', 'is', null);
      }
    }


    // For random ordering, fetch all matching questions first, then shuffle
    if (random && !questionId) {
      const { data: allData, error: allError } = await query;
      
      if (allError) {
        console.error('[Review API] Error fetching questions:', allError);
        return NextResponse.json(
          { error: 'Failed to fetch questions', details: allError.message },
          { status: 500 }
        );
      }

      // Shuffle the results
      const shuffled = shuffleArray(allData || []);
      
      // Apply pagination to shuffled results
      const paginated = shuffled.slice(offset, offset + limit);

      // Normalize questions
      const normalizedQuestions: ReviewQuestion[] = paginated.map((row: any) => {
        try {
          return normalizeReviewQuestion(row);
        } catch (err) {
          console.error('[Review API] Error normalizing question:', err, row);
          return normalizeReviewQuestion({
            id: row.id || '',
            generation_id: row.generation_id || '',
            schema_id: row.schema_id || '',
            difficulty: row.difficulty || 'Medium',
            question_stem: row.question_stem || '',
            options: row.options || {},
            correct_option: row.correct_option || 'A',
            status: row.status || 'pending',
          });
        }
      });

      return NextResponse.json({
        questions: normalizedQuestions,
        total: shuffled.length,
      });
    }

    // Non-random ordering: use database ordering
    if (!questionId) {
      if (sortMode === 'created_asc') {
        query = query.order('created_at', { ascending: true, nullsFirst: false });
      } else if (sortMode === 'created_desc') {
        query = query.order('created_at', { ascending: false, nullsFirst: false });
      } else {
        // updated_desc (default) — catches rows just inserted with stale pipeline created_at
        query = query.order('updated_at', { ascending: false, nullsFirst: false });
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Review API] Error fetching questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: error.message },
        { status: 500 }
      );
    }

    // Normalize and validate all questions
    const normalizedQuestions: ReviewQuestion[] = (data || []).map((row: any) => {
      try {
        return normalizeReviewQuestion(row);
      } catch (err) {
        console.error('[Review API] Error normalizing question:', err, row);
        return normalizeReviewQuestion({
          id: row.id || '',
          generation_id: row.generation_id || '',
          schema_id: row.schema_id || '',
          difficulty: row.difficulty || 'Medium',
          question_stem: row.question_stem || '',
          options: row.options || {},
          correct_option: row.correct_option || 'A',
          status: row.status || 'pending',
        });
      }
    });

    return NextResponse.json({
      questions: normalizedQuestions,
      total: count || 0,
    });
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
