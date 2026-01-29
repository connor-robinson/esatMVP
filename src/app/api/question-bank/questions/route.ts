import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { SubjectFilter, DifficultyFilter, AttemptResultFilter, AttemptedFilter } from '@/types/questionBank';

export const dynamic = 'force-dynamic';

/**
 * GET /api/question-bank/questions
 * Fetches questions with optional filtering
 * Query params: subject, difficulty, tags, limit, offset, random, reviewStatus, attemptedStatus
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    console.log('[Question Bank API] ===== FILTER DEBUG START =====');
    console.log('[Question Bank API] Request URL:', request.url);
    console.log('[Question Bank API] All search params:', Object.fromEntries(searchParams.entries()));

    // ============================================================================
    // STAGE 0: Parse and validate all filter parameters
    // ============================================================================
    const testTypeParam = searchParams.get('testType');
    const testType = testTypeParam && testTypeParam !== 'All' ? testTypeParam as 'ESAT' | 'TMUA' : null;
    const subjectParam = searchParams.get('subject');
    const subjects = subjectParam ? subjectParam.split(',').filter(s => s && s !== 'All') as SubjectFilter[] : [];
    const difficultyParam = searchParams.get('difficulty');
    const difficulties = difficultyParam ? difficultyParam.split(',').filter(d => d && d !== 'All') as DifficultyFilter[] : [];
    const attemptResultParam = searchParams.get('attemptResult');
    const attemptResults = attemptResultParam ? attemptResultParam.split(',') as AttemptResultFilter[] : [];
    const attemptedStatusParam = searchParams.get('attemptedStatus');
    // Fix: Handle null as "Mix" - when Mix is selected, param is not sent
    const attemptedStatus: AttemptedFilter | null = attemptedStatusParam as AttemptedFilter | null;
    const tags = searchParams.get('tags') || '';
    const search = searchParams.get('search') || '';
    const idParam = searchParams.get('id') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';

    // Get user session for attempted status filtering
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    console.log('[Question Bank API] Stage 0: Parsed Filters', {
      testType: testType || 'All',
      subjects: subjects.length > 0 ? subjects : 'All',
      difficulties: difficulties.length > 0 ? difficulties : 'All',
      attemptResults: attemptResults.length > 0 ? attemptResults : 'None',
      attemptedStatus: attemptedStatus || 'Mix (null)',
      tags: tags || 'None',
      search: search || 'None',
      idParam: idParam || 'None',
      limit,
      offset,
      random,
      userId: userId || 'Not authenticated'
    });

    // Validate attempted status filter - requires authentication
    // Note: null attemptedStatus means "Mix" (show all), which doesn't need auth
    if (attemptedStatus && attemptedStatus !== 'Mix' && !userId) {
      console.warn('[Question Bank API] Attempted status filter requested but user not authenticated');
      return NextResponse.json(
        { 
          error: 'Authentication required to filter by attempt status. Please log in or use "Mix" filter.',
          questions: [],
          count: 0
        },
        { status: 401 }
      );
    }

    // ============================================================================
    // STAGE 0.5: Database Verification Queries
    // ============================================================================
    console.log('[Question Bank API] Stage 0.5: Database Verification');
    
    // Check total approved questions
    const { count: totalApproved } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    console.log('[Question Bank API] ✓ Total approved questions:', totalApproved);

    // Check questions by test_type
    const { count: esatCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('test_type', 'ESAT');
    const { count: tmuaCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('test_type', 'TMUA');
    const { count: nullTestTypeCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .is('test_type', null);
    console.log('[Question Bank API] ✓ Questions by test_type:', {
      ESAT: esatCount,
      TMUA: tmuaCount,
      null: nullTestTypeCount
    });

    // Check unique subjects in database
    const { data: subjectSample } = await supabase
      .from('ai_generated_questions')
      .select('subjects, test_type')
      .eq('status', 'approved')
      .limit(500);
    const uniqueSubjects = [...new Set((subjectSample || []).map((q: any) => q.subjects))];
    const uniqueTestTypes = [...new Set((subjectSample || []).map((q: any) => q.test_type))];
    console.log('[Question Bank API] ✓ Unique subjects in DB:', uniqueSubjects);
    console.log('[Question Bank API] ✓ Unique test_types in DB:', uniqueTestTypes);

    // Check questions by difficulty
    const { count: easyCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('difficulty', 'Easy');
    const { count: mediumCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('difficulty', 'Medium');
    const { count: hardCount } = await supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('difficulty', 'Hard');
    console.log('[Question Bank API] ✓ Questions by difficulty:', {
      Easy: easyCount,
      Medium: mediumCount,
      Hard: hardCount
    });

    // ============================================================================
    // STAGE 1: Build base query (status = 'approved')
    // ============================================================================
    console.log('[Question Bank API] Stage 1: Building base query (status = approved)');
    let query = supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');
    
    let stageCount = totalApproved || 0;
    console.log('[Question Bank API] Stage 1: After base query - Count:', stageCount);

    // ============================================================================
    // STAGE 2: Apply test_type filter
    // ============================================================================
    if (testType) {
      console.log('[Question Bank API] Stage 2: Applying test_type filter:', testType);
      query = query.eq('test_type', testType);
      stageCount = testType === 'ESAT' ? esatCount || 0 : tmuaCount || 0;
      console.log('[Question Bank API] Stage 2: After test_type filter - Expected count:', stageCount, 'Filter:', testType);
    } else {
      console.log('[Question Bank API] Stage 2: No test_type filter (showing All)');
      console.log('[Question Bank API] Stage 2: After test_type filter - Count:', stageCount, '(unchanged)');
    }

    // ============================================================================
    // STAGE 3: Apply subject filter
    // ============================================================================
    if (subjects.length > 0) {
      console.log('[Question Bank API] Stage 3: Applying subject filter:', subjects);
      
      // Validate subjects exist in database
      const invalidSubjects = subjects.filter(s => !uniqueSubjects.includes(s));
      if (invalidSubjects.length > 0) {
        console.warn('[Question Bank API] ⚠️ Invalid subjects requested:', invalidSubjects);
        console.warn('[Question Bank API] ⚠️ Valid subjects are:', uniqueSubjects);
      }
      
      if (subjects.length === 1) {
        query = query.eq('subjects', subjects[0]);
        console.log('[Question Bank API] Stage 3: Applied single subject filter:', subjects[0]);
      } else {
        query = query.in('subjects', subjects);
        console.log('[Question Bank API] Stage 3: Applied multiple subject filter:', subjects);
      }
    } else {
      console.log('[Question Bank API] Stage 3: No subject filter (showing All)');
    }

    // ============================================================================
    // STAGE 4: Apply difficulty filter
    // ============================================================================
    if (difficulties.length > 0) {
      console.log('[Question Bank API] Stage 4: Applying difficulty filter:', difficulties);
      if (difficulties.length === 1) {
        query = query.eq('difficulty', difficulties[0]);
        console.log('[Question Bank API] Stage 4: Applied single difficulty filter:', difficulties[0]);
      } else {
        query = query.in('difficulty', difficulties);
        console.log('[Question Bank API] Stage 4: Applied multiple difficulty filter:', difficulties);
      }
    } else {
      console.log('[Question Bank API] Stage 4: No difficulty filter (showing All)');
    }

    // ============================================================================
    // STAGE 5: Apply ID search filter
    // ============================================================================
    if (idParam) {
      console.log('[Question Bank API] Stage 5: Applying ID search filter:', idParam);
      query = query.or(`generation_id.eq.${idParam},id.eq.${idParam}`);
    } else {
      console.log('[Question Bank API] Stage 5: No ID search filter');
    }

    // ============================================================================
    // STAGE 6: Apply search filter (question stem content search)
    // ============================================================================
    if (search && !idParam) {
      console.log('[Question Bank API] Stage 6: Applying search filter:', search);
      query = query.ilike('question_stem', `%${search}%`);
    } else {
      console.log('[Question Bank API] Stage 6: No search filter');
    }

    // ============================================================================
    // STAGE 7: Apply tag filter
    // ============================================================================
    if (tags) {
      console.log('[Question Bank API] Stage 7: Applying tag filter:', tags);
      const tagLower = tags.toLowerCase();
      query = query.filter('or', 'or', `(primary_tag.ilike.%${tagLower}%,secondary_tags.cs.{${tagLower}})`);
    } else {
      console.log('[Question Bank API] Stage 7: No tag filter');
    }

    // ============================================================================
    // STAGE 8: Apply ordering and limits (before executing query)
    // ============================================================================
    console.log('[Question Bank API] Stage 8: Applying ordering and limits');
    if (random) {
      query = query.limit(Math.min(limit * 2, 200));
      console.log('[Question Bank API] Stage 8: Random mode - limit:', Math.min(limit * 2, 200));
    } else {
      const fetchLimit = Math.min(Math.max(limit * 1.5, 20), 300);
      query = query.limit(fetchLimit).order('created_at', { ascending: false });
      console.log('[Question Bank API] Stage 8: Sequential mode - limit:', fetchLimit, 'ordered by created_at DESC');
    }

    // ============================================================================
    // STAGE 9: Execute base query and log results
    // ============================================================================
    console.log('[Question Bank API] Stage 9: Executing database query...');
    const { data: allQuestions, error: queryError, count: totalCount } = await query;

    if (queryError) {
      console.error('[Question Bank API] ❌ Database query error:', {
        error: queryError,
        code: queryError.code,
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint
      });
      return NextResponse.json(
        { error: 'Failed to fetch questions from database', details: queryError.message },
        { status: 500 }
      );
    }
    
    console.log('[Question Bank API] Stage 9: Query executed successfully', {
      questionsReturned: allQuestions?.length || 0,
      totalCountFromSupabase: totalCount,
      sampleIds: allQuestions?.slice(0, 3).map((q: any) => q.id) || []
    });
    
    if (allQuestions && allQuestions.length > 0) {
      const sample = allQuestions[0] as any;
      console.log('[Question Bank API] Stage 9: Sample question from query:', {
        id: sample.id,
        subjects: sample.subjects,
        test_type: sample.test_type,
        difficulty: sample.difficulty,
        status: sample.status
      });
    } else {
      console.warn('[Question Bank API] ⚠️ Stage 9: Query returned 0 questions');
    }

    // ============================================================================
    // STAGE 10: Prepare attempt-based filtering data (if needed)
    // ============================================================================
    let attemptedQuestionIds: string[] = [];
    let incorrectQuestionIds: string[] = [];
    let correctQuestionIds: string[] = [];
    let questionResults: Map<string, { hasCorrect: boolean; hasIncorrect: boolean }> = new Map();
    
    // Determine if we need to fetch attempts
    // Fix: null attemptedStatus means "Mix" - don't fetch attempts
    const needsAttemptData = (attemptedStatus && attemptedStatus !== 'Mix') || (attemptResults.length > 0);
    
    if (needsAttemptData && userId) {
      console.log('[Question Bank API] Stage 10: Fetching user attempt data (attemptedStatus:', attemptedStatus, 'attemptResults:', attemptResults, ')');
      try {
        const { data: attempts, error: attemptsError } = await supabase
          .from('question_bank_attempts')
          .select('question_id, is_correct')
          .eq('user_id', userId);
        
        if (attemptsError) {
          console.error('[Question Bank API] ❌ Error fetching attempts:', attemptsError);
        } else if (attempts) {
          attemptedQuestionIds = [...new Set(attempts.map((a: any) => a.question_id))];
          
          questionResults = new Map<string, { hasCorrect: boolean; hasIncorrect: boolean }>();
          attempts.forEach((a: any) => {
            const existing = questionResults.get(a.question_id) || { hasCorrect: false, hasIncorrect: false };
            if (a.is_correct) {
              existing.hasCorrect = true;
            } else {
              existing.hasIncorrect = true;
            }
            questionResults.set(a.question_id, existing);
          });
          
          incorrectQuestionIds = Array.from(questionResults.entries())
            .filter(([_, result]) => result.hasIncorrect)
            .map(([id, _]) => id);
          
          correctQuestionIds = Array.from(questionResults.entries())
            .filter(([_, result]) => result.hasCorrect)
            .map(([id, _]) => id);
          
          const mixedResultsQuestionIds = Array.from(questionResults.entries())
            .filter(([_, result]) => result.hasCorrect && result.hasIncorrect)
            .map(([id, _]) => id);
          
          console.log('[Question Bank API] Stage 10: Attempt data loaded', {
            totalAttempts: attempts.length,
            uniqueQuestionsAttempted: attemptedQuestionIds.length,
            incorrect: incorrectQuestionIds.length,
            correct: correctQuestionIds.length,
            mixedResults: mixedResultsQuestionIds.length
          });
        } else {
          console.log('[Question Bank API] Stage 10: No attempts found for user');
        }
      } catch (err) {
        console.error('[Question Bank API] ❌ Unexpected error fetching attempts:', err);
      }
    } else {
      if (!userId) {
        console.log('[Question Bank API] Stage 10: Skipping attempt data (user not authenticated)');
      } else {
        console.log('[Question Bank API] Stage 10: Skipping attempt data (Mix mode - showing all questions)');
      }
    }

    // ============================================================================
    // STAGE 11: Apply attempt-based filters (client-side)
    // ============================================================================
    let filteredQuestions = allQuestions || [];
    const beforeAttemptFilterCount = filteredQuestions.length;
    
    console.log('[Question Bank API] Stage 11: Applying attempt-based filters', {
      beforeCount: beforeAttemptFilterCount,
      attemptedStatus: attemptedStatus || 'Mix (null)',
      attemptResults: attemptResults.length > 0 ? attemptResults : 'None'
    });

    // Apply attemptedStatus filter
    if (attemptedStatus && attemptedStatus !== 'Mix' && userId) {
      const attemptedSet = new Set(attemptedQuestionIds);
      const beforeCount = filteredQuestions.length;
      
      if (attemptedStatus === 'New') {
        filteredQuestions = filteredQuestions.filter((q: any) => !attemptedSet.has(q.id));
        console.log('[Question Bank API] Stage 11a: Applied "New" filter', {
          before: beforeCount,
          after: filteredQuestions.length,
          removed: beforeCount - filteredQuestions.length
        });
      } else if (attemptedStatus === 'Attempted') {
        filteredQuestions = filteredQuestions.filter((q: any) => attemptedSet.has(q.id));
        console.log('[Question Bank API] Stage 11a: Applied "Attempted" filter', {
          before: beforeCount,
          after: filteredQuestions.length,
          removed: beforeCount - filteredQuestions.length
        });
      }
    } else {
      console.log('[Question Bank API] Stage 11a: No attemptedStatus filter (Mix mode)');
    }
    
    // Apply attemptResult filter
    if (attemptResults.length > 0 && userId) {
      const attemptedSet = new Set(attemptedQuestionIds);
      const incorrectSet = new Set(incorrectQuestionIds);
      const mixedResultsSet = new Set(
        Array.from(questionResults?.entries() || [])
          .filter(([_, result]) => result.hasCorrect && result.hasIncorrect)
          .map(([id, _]) => id)
      );
      
      const beforeCount = filteredQuestions.length;
      const resultFilters: ((q: any) => boolean)[] = [];
      
      attemptResults.forEach(result => {
        if (result === 'Unseen') {
          resultFilters.push((q: any) => !attemptedSet.has(q.id));
        } else if (result === 'Mixed Results') {
          resultFilters.push((q: any) => mixedResultsSet.has(q.id));
        } else if (result === 'Incorrect Before') {
          resultFilters.push((q: any) => incorrectSet.has(q.id));
        }
      });
      
      if (resultFilters.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => 
          resultFilters.some(filter => filter(q))
        );
        console.log('[Question Bank API] Stage 11b: Applied attemptResult filter', {
          before: beforeCount,
          after: filteredQuestions.length,
          removed: beforeCount - filteredQuestions.length,
          filters: attemptResults
        });
      }
    } else {
      console.log('[Question Bank API] Stage 11b: No attemptResult filter');
    }

    // ============================================================================
    // STAGE 12: Shuffle and paginate
    // ============================================================================
    console.log('[Question Bank API] Stage 12: Shuffling and paginating', {
      beforeShuffle: filteredQuestions.length,
      random,
      limit,
      offset
    });

    if (random) {
      filteredQuestions = shuffleArray(filteredQuestions);
    }

    const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);
    
    console.log('[Question Bank API] Stage 12: After pagination', {
      totalFiltered: filteredQuestions.length,
      paginated: paginatedQuestions.length,
      offset,
      limit
    });

    // ============================================================================
    // STAGE 13: Final processing and response
    // ============================================================================
    const count = (attemptedStatus && attemptedStatus !== 'Mix') || attemptResults.length > 0 || tags
      ? filteredQuestions.length
      : (totalCount !== null ? totalCount : filteredQuestions.length);

    // Parse options and distractor_map JSONB to proper format
    const questions = (paginatedQuestions || []).map((q: any) => {
      try {
        return {
          ...q,
          options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          distractor_map: q.distractor_map && typeof q.distractor_map === 'string' 
            ? JSON.parse(q.distractor_map) 
            : q.distractor_map,
        };
      } catch (parseError) {
        console.error('[Question Bank API] Error parsing question data:', parseError, q);
        return q;
      }
    });

    // Sort questions by status priority if not random
    let finalQuestions = questions;
    if (!random) {
      finalQuestions = questions.sort((a: any, b: any) => {
        const statusPriority: Record<string, number> = {
          'pending_review': 1,
          'needs_revision': 1,
          'approved': 2,
          'rejected': 3,
        };
        const aPriority = statusPriority[a.status] || 999;
        const bPriority = statusPriority[b.status] || 999;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    // ============================================================================
    // FINAL: Summary and diagnostic queries if needed
    // ============================================================================
    console.log('[Question Bank API] ===== FILTER DEBUG SUMMARY =====');
    console.log('[Question Bank API] Final result:', {
      questionsReturned: finalQuestions.length,
      totalCount: count,
      filters: {
        testType: testType || 'All',
        subjects: subjects.length > 0 ? subjects : 'All',
        difficulties: difficulties.length > 0 ? difficulties : 'All',
        attemptResults: attemptResults.length > 0 ? attemptResults : 'None',
        attemptedStatus: attemptedStatus || 'Mix (null)',
        tags: tags || 'None',
        search: search || 'None'
      },
      stages: {
        stage1_base: totalApproved,
        stage9_afterQuery: allQuestions?.length || 0,
        stage11_afterAttemptFilter: filteredQuestions.length,
        stage12_afterPagination: paginatedQuestions.length
      }
    });

    // If no questions found, run diagnostic queries
    if (finalQuestions.length === 0) {
      console.warn('[Question Bank API] ⚠️ NO QUESTIONS FOUND - Running diagnostic queries...');
      
      // Diagnostic 1: Just status filter
      const { count: diag1 } = await supabase
        .from('ai_generated_questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      console.log('[Question Bank API] Diagnostic 1 (status=approved):', diag1);
      
      // Diagnostic 2: Status + test_type
      if (testType) {
        const { count: diag2 } = await supabase
          .from('ai_generated_questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('test_type', testType);
        console.log('[Question Bank API] Diagnostic 2 (status=approved, test_type=' + testType + '):', diag2);
      }
      
      // Diagnostic 3: Status + test_type + subject
      if (testType && subjects.length > 0) {
        const { count: diag3 } = await supabase
          .from('ai_generated_questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('test_type', testType)
          .in('subjects', subjects);
        console.log('[Question Bank API] Diagnostic 3 (status=approved, test_type=' + testType + ', subjects=' + subjects.join(',') + '):', diag3);
      }
      
      // Diagnostic 4: Status + test_type + subject + difficulty
      if (testType && subjects.length > 0 && difficulties.length > 0) {
        const { count: diag4 } = await supabase
          .from('ai_generated_questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .eq('test_type', testType)
          .in('subjects', subjects)
          .in('difficulty', difficulties);
        console.log('[Question Bank API] Diagnostic 4 (status=approved, test_type=' + testType + ', subjects=' + subjects.join(',') + ', difficulties=' + difficulties.join(',') + '):', diag4);
      }
    }

    console.log('[Question Bank API] ===== FILTER DEBUG END =====');

    return NextResponse.json({
      questions: finalQuestions,
      count: count,
      totalCount: totalCount || 0
    });
  } catch (error) {
    console.error('[Question Bank API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
