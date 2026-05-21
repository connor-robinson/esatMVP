import { NextRequest, NextResponse } from 'next/server';
import { getReviewSupabase } from '@/lib/supabaseService';
import {
  expandReviewSubjectFilterValues,
  REVIEW_FILTER_ESAT_POSTGREST_OR,
  REVIEW_FILTER_TMUA_POSTGREST_OR,
} from '@/lib/curriculum';
import { normalizeReviewQuestion } from '@/lib/utils';
import type { ReviewQuestion, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

/** Prevent browser/CDN caching of question rows so edits and uploads always re-fetch fresh DB state. */
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const;

/**
 * List/card fetch: omit heavy JSONB columns (idea_plan, reports, etc.).
 * Full row when `id=…` or slim omitted.
 *
 * Only include columns that exist on every deployed `ai_generated_questions` schema.
 * Omit:
 * - `graphs`, `solution_graphs` — not applied on all projects; PostgREST errors → 500.
 * - `media_upload_code`, `screen_video_storage_path` — require
 *   `esat_question_generator/migrations/add_question_media.sql` on the DB. Included in slim so
 *   list/dashboard rows show walkthrough state; if your project never ran that migration, remove
 *   these two names from SLIM_QUESTION_COLUMNS below.
 * - `is_good_question` — from `supabase/migrations/20250203000000_add_is_good_question.sql`;
 *   some production DBs never ran it.
 * - `schema_reclass_*` — from `esat_question_generator/migrations/add_schema_reclass_review.sql`;
 *   if missing, use slim=0 or full id= fetch.
 * - `quality_gate_*` — from `esat_question_generator/migrations/add_quality_gate.sql`; if missing,
 *   use slim=0 or omit these names from SLIM_QUESTION_COLUMNS.
 * - `quality_gate_calibration_tier`, `quality_gate_graph_*` — from
 *   `esat_question_generator/migrations/add_quality_gate_calibration_graph.sql`.
 *   **Not included in SLIM** — PostgREST errors if any selected column is missing; many DBs have
 *   base `add_quality_gate.sql` but not the calibration/graph migration yet. Full/detail fetches
 *   use `*` and still return those fields when present.
 * - `question_stem_before_auto_diagram` — from
 *   `esat_question_generator/migrations/add_question_stem_before_auto_diagram.sql`; remove from
 *   SLIM_QUESTION_COLUMNS if that migration is not applied.
 * Detail fetches use `*` and receive those fields when the columns exist.
 */
const SLIM_QUESTION_COLUMNS =
  'id, generation_id, schema_id, difficulty, status, question_stem, question_stem_before_auto_diagram, options, correct_option, solution_reasoning, solution_key_insight, distractor_map, subjects, primary_tag, secondary_tags, test_type, created_at, updated_at, schema_reclass_review_tier, schema_reclass_old_id, schema_reclass_new_id, media_upload_code, screen_video_storage_path, quality_gate_assessed_at, quality_gate_verdict, quality_gate_action, quality_gate_reason, quality_gate_job_id, quality_gate_model, quality_gate_diagram_backfill_kind, quality_gate_diagram_backfill_at, pipeline, has_visual, visual_type, visual_renderer, visual_qc_status, diagram_regen_status, diagram_regen_completed_at';

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
    const mediaUploadCodeRaw = searchParams.get('mediaUploadCode')?.trim() ?? '';
    const mediaUploadCodeNorm = mediaUploadCodeRaw.toUpperCase();
    const mediaUploadCodeLookup =
      mediaUploadCodeNorm.length > 0 && /^[A-Z]{2}\d{2}$/.test(mediaUploadCodeNorm)
        ? mediaUploadCodeNorm
        : null;
    const limit = parseInt(searchParams.get('limit') || '1', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';
    /** Default newest-first: workspace omits sort and was getting created_at ASC → oldest 500 rows only (new syncs invisible). */
    const sortMode = (searchParams.get('sort') || 'updated_desc').trim();
    const slimRequested =
      searchParams.get('slim') === '1' || searchParams.get('slim') === 'true';
    const selectColumns =
      questionId || !slimRequested ? '*' : SLIM_QUESTION_COLUMNS;

    /**
     * Single-row fetch by PK must match `/api/review/debug-supabase` probe: `.maybeSingle()` without
     * `count: 'exact'` or `.range()`. Otherwise some clients saw a short `question_stem` while the
     * debug route (same DB) returned the full SVG stem — same data, different PostgREST request shape.
     */
    const idTrimmed = questionId?.trim() ?? '';
    if (idTrimmed.length > 0) {
      const { data: row, error: byIdError } = await supabase
        .from('ai_generated_questions')
        .select('*')
        .eq('id', idTrimmed)
        .maybeSingle();

      if (byIdError) {
        console.error('[Review API] Error fetching question by id:', byIdError);
        return NextResponse.json(
          { error: 'Failed to fetch questions', details: byIdError.message },
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }

      if (!row) {
        return NextResponse.json({ questions: [], total: 0 }, { headers: NO_STORE_HEADERS });
      }

      const stemRaw = (row as { question_stem?: unknown }).question_stem;
      const stemStr = typeof stemRaw === 'string' ? stemRaw : '';
      const backupRaw = (row as { question_stem_before_auto_diagram?: unknown })
        .question_stem_before_auto_diagram;
      const backupStr = typeof backupRaw === 'string' ? backupRaw : '';
      console.log('[review-persist] GET /questions by id (maybeSingle raw)', {
        questionId: idTrimmed,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
        stem_length: stemStr.length,
        stem_includes_svg: stemStr.includes('<svg'),
        backup_length: backupStr.length,
        raw_updated_at: (row as { updated_at?: string }).updated_at,
      });

      let normalized: ReviewQuestion;
      try {
        normalized = normalizeReviewQuestion(row);
      } catch (err) {
        console.error('[Review API] Error normalizing question:', err, row);
        normalized = normalizeReviewQuestion({
          id: (row as { id?: string }).id || '',
          generation_id: (row as { generation_id?: string }).generation_id || '',
          schema_id: (row as { schema_id?: string }).schema_id || '',
          difficulty: (row as { difficulty?: string }).difficulty || 'Medium',
          question_stem: (row as { question_stem?: string }).question_stem || '',
          options: (row as { options?: unknown }).options || {},
          correct_option: (row as { correct_option?: string }).correct_option || 'A',
          status: (row as { status?: string }).status || 'pending',
        });
      }

      const stem = normalized.question_stem || '';
      console.log('[review-persist] GET /questions by id (after normalize)', {
        id: normalized.id,
        stem_length: stem.length,
        stem_includes_svg: stem.includes('<svg'),
        updated_at: normalized.updated_at,
      });

      return NextResponse.json(
        { questions: [normalized], total: 1 },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Build query (list / filters — no `id` param)
    let query = supabase
      .from('ai_generated_questions')
      .select(selectColumns, { count: 'exact' });

    {
      if (mediaUploadCodeLookup) {
        query = query.eq('media_upload_code', mediaUploadCodeLookup);
      }

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
        query = query.or(REVIEW_FILTER_TMUA_POSTGREST_OR);
      } else if (paperType === 'ESAT') {
        query = query.or(REVIEW_FILTER_ESAT_POSTGREST_OR);
      }

      if (subjects.length > 0) {
        query = query.in('subjects', expandReviewSubjectFilterValues(subjects));
      }

      if (diffFiltered.length > 0) {
        query = query.in('difficulty', diffFiltered);
      }

      if (statusFiltered.length > 0) {
        query = query.in('status', statusFiltered);
      } else if (!mediaUploadCodeLookup) {
        /* Default: hide soft-deleted unless client passes status=deleted (or multi-status including it). */
        query = query.neq('status', 'deleted');
      }

      if (videoOnly) {
        query = query.not('screen_video_storage_path', 'is', null);
      }

      const schemaReclassTier = searchParams.get('schemaReclassTier');
      if (
        schemaReclassTier === 'urgent' ||
        schemaReclassTier === 'secondary' ||
        schemaReclassTier === 'review_needed'
      ) {
        query = query.eq('schema_reclass_review_tier', schemaReclassTier);
      } else if (schemaReclassTier === 'any') {
        query = query.not('schema_reclass_review_tier', 'is', null);
      }

      const qualityGateVerdictsParam = searchParams.get('qualityGateVerdict');
      const qualityGateVerdicts = qualityGateVerdictsParam
        ? qualityGateVerdictsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const allowedQgv = new Set(['Pass', 'Minor', 'Major']);
      const qgvFiltered = qualityGateVerdicts.filter((v) => allowedQgv.has(v));
      if (qgvFiltered.length === 1) {
        query = query.eq('quality_gate_verdict', qgvFiltered[0]);
      } else if (qgvFiltered.length > 1) {
        query = query.in('quality_gate_verdict', qgvFiltered);
      }

      if (searchParams.get('qualityGateUnassessed') === '1' || searchParams.get('qualityGateUnassessed') === 'true') {
        query = query.is('quality_gate_assessed_at', null);
      }

      const qualityGateJobId = searchParams.get('qualityGateJobId')?.trim();
      if (qualityGateJobId) {
        query = query.eq('quality_gate_job_id', qualityGateJobId);
      }

      if (searchParams.get('qualityGateCalibrationGold') === '1') {
        query = query.eq('quality_gate_calibration_tier', 'gold');
      }

      if (
        searchParams.get('qualityGateGraphCandidate') === '1' ||
        searchParams.get('qualityGateGraphCandidate') === 'true'
      ) {
        query = query.eq('quality_gate_graph_candidate', true);
      }
    }


    // For random ordering, fetch all matching questions first, then shuffle
    if (random && !questionId) {
      const { data: allData, error: allError } = await query;
      
      if (allError) {
        console.error('[Review API] Error fetching questions:', allError);
        return NextResponse.json(
          { error: 'Failed to fetch questions', details: allError.message },
          { status: 500, headers: NO_STORE_HEADERS }
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

      return NextResponse.json(
        {
          questions: normalizedQuestions,
          total: shuffled.length,
        },
        { headers: NO_STORE_HEADERS }
      );
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
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (questionId && (data || []).length > 0) {
      const raw = (data as any[])[0];
      const stemRaw = raw?.question_stem;
      const stemStr = typeof stemRaw === 'string' ? stemRaw : '';
      const backupRaw = raw?.question_stem_before_auto_diagram;
      const backupStr = typeof backupRaw === 'string' ? backupRaw : '';
      console.log('[review-persist] GET /questions by id (raw row from PostgREST)', {
        questionId,
        limit,
        offset,
        raw_correct_option: raw?.correct_option,
        raw_updated_at: raw?.updated_at,
        rowCount: (data || []).length,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
        /** Helps debug “SVG in Table Editor but not in API JSON” (env mismatch vs stale client). */
        stem_field_type: typeof stemRaw,
        stem_length: stemStr.length,
        stem_includes_svg: stemStr.includes('<svg'),
        backup_length: backupStr.length,
        backup_includes_svg: backupStr.includes('<svg'),
      });
    } else if (questionId) {
      console.warn('[review-persist] GET /questions by id returned zero rows', {
        questionId,
        limit,
        offset,
      });
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

    if (questionId && normalizedQuestions[0]) {
      const n0 = normalizedQuestions[0];
      const stem = n0.question_stem || '';
      console.log('[review-persist] GET /questions by id (after normalizeReviewQuestion)', {
        id: n0.id,
        correct_option: n0.correct_option,
        updated_at: n0.updated_at,
        stem_length: stem.length,
        stem_includes_svg: stem.includes('<svg'),
        backup_includes_svg: (n0.question_stem_before_auto_diagram || '').includes('<svg'),
      });
    }

    return NextResponse.json(
      {
        questions: normalizedQuestions,
        total: count || 0,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error: any) {
    console.error('[Review API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
