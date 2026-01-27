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

    // Get filter parameters - support comma-separated values for multi-select
    const testTypeParam = searchParams.get('testType');
    const testType = testTypeParam && testTypeParam !== 'All' ? testTypeParam as 'ESAT' | 'TMUA' : null;
    const subjectParam = searchParams.get('subject');
    const subjects = subjectParam ? subjectParam.split(',').filter(s => s && s !== 'All') as SubjectFilter[] : [];
    const difficultyParam = searchParams.get('difficulty');
    const difficulties = difficultyParam ? difficultyParam.split(',').filter(d => d && d !== 'All') as DifficultyFilter[] : [];
    const attemptResultParam = searchParams.get('attemptResult');
    const attemptResults = attemptResultParam ? attemptResultParam.split(',') as AttemptResultFilter[] : [];
    const attemptedStatus = searchParams.get('attemptedStatus') as AttemptedFilter | null;
    const tags = searchParams.get('tags') || '';
    const search = searchParams.get('search') || '';
    const idParam = searchParams.get('id') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';

    // Get user session for attempted status filtering
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Validate attempted status filter - requires authentication
    if (attemptedStatus && attemptedStatus !== 'Mix' && !userId) {
      // If user is not logged in but wants to filter by attempt status, return error
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

    // Build query - only fetch approved questions
    let query = supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact' })
      .eq('status', 'approved');
    
    // 1. Apply test_type filter first (ESAT or TMUA)
    if (testType) {
      query = query.eq('test_type', testType);
      console.log('[Question Bank API] Filtering by test_type:', testType);
    }
    
    // 2. Apply subject filter using subjects column
    // Map filter values to database values:
    // ESAT subjects: 'Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology'
    // TMUA subjects: 'Paper 1', 'Paper 2'
    
    if (subjects.length > 0) {
      console.log('[Question Bank API] Incoming subject filters:', subjects);
      
      // Subjects are already in the correct format (no mapping needed)
      // Filter by subjects column
      if (subjects.length === 1) {
        query = query.eq('subjects', subjects[0]);
      } else {
        query = query.in('subjects', subjects);
      }
    }

    // 2. Apply difficulty filter (ANDed with subject filter)
    if (difficulties.length > 0) {
      if (difficulties.length === 1) {
        query = query.eq('difficulty', difficulties[0]);
      } else {
        // Multiple difficulties: use .in() for clean AND logic with subjects
        query = query.in('difficulty', difficulties);
      }
    }

    // 3. Apply ID search filter (if provided)
    if (idParam) {
      // Search by generation_id or id (UUID)
      query = query.or(`generation_id.eq.${idParam},id.eq.${idParam}`);
    }

    // 4. Apply search filter (question stem content search)
    if (search && !idParam) {
      query = query.ilike('question_stem', `%${search}%`);
    }

    // 5. Apply tag filter (ANDed with previous filters)
    if (tags) {
      const tagLower = tags.toLowerCase();
      // If we already have a subject filter (which used .or()), we must use .filter() 
      // for the second OR group to avoid overwriting the first one.
      // PostgREST supports multiple OR groups by using the 'or' parameter multiple times.
      query = query.filter('or', 'or', `(primary_tag.ilike.%${tagLower}%,secondary_tags.cs.{${tagLower}})`);
    }

    // Apply attempted status and attempt result filter (server-side)
    // Note: We'll fetch attempted question data first, then apply the filters
    let attemptedQuestionIds: string[] = [];
    let incorrectQuestionIds: string[] = [];
    let correctQuestionIds: string[] = [];
    
    // Fetch user attempts if needed (for attemptedStatus or attemptResult filtering)
    if ((attemptedStatus && attemptedStatus !== 'Mix' && userId) || (attemptResults.length > 0 && userId)) {
      try {
        // Fetch ALL attempts with correct/incorrect status
        const { data: attempts, error: attemptsError } = await supabase
          .from('question_bank_attempts')
          .select('question_id, is_correct')
          .eq('user_id', userId);
        
        if (attemptsError) {
          console.error('[Question Bank API] Error fetching attempts:', attemptsError);
          // Continue without attempted filter if there's an error
        } else if (attempts) {
          // Get unique question IDs (user might have multiple attempts on same question)
          attemptedQuestionIds = [...new Set(attempts.map((a: any) => a.question_id))];
          
          // Separate correct and incorrect questions
          // For each question, check if user has ever gotten it correct
          const questionResults = new Map<string, { hasCorrect: boolean; hasIncorrect: boolean }>();
          attempts.forEach((a: any) => {
            const existing = questionResults.get(a.question_id) || { hasCorrect: false, hasIncorrect: false };
            if (a.is_correct) {
              existing.hasCorrect = true;
            } else {
              existing.hasIncorrect = true;
            }
            questionResults.set(a.question_id, existing);
          });
          
          // Questions that have at least one incorrect attempt
          incorrectQuestionIds = Array.from(questionResults.entries())
            .filter(([_, result]) => result.hasIncorrect)
            .map(([id, _]) => id);
          
          // Questions that have at least one correct attempt
          correctQuestionIds = Array.from(questionResults.entries())
            .filter(([_, result]) => result.hasCorrect)
            .map(([id, _]) => id);
          
          console.log(`[Question Bank API] Found ${attempts.length} total attempts, ${attemptedQuestionIds.length} unique questions attempted by user ${userId}`);
          console.log(`[Question Bank API] Incorrect: ${incorrectQuestionIds.length}, Correct: ${correctQuestionIds.length}`);
        } else {
          console.log(`[Question Bank API] No attempts found for user ${userId}`);
        }
      } catch (err) {
        console.error('[Question Bank API] Unexpected error fetching attempts:', err);
        // Continue without attempted filter if there's an error
      }
    }

    // Apply ordering and limits
    // If random is true, we fetch a larger pool and shuffle client-side
    // We should at least order by something to ensure deterministic but variety-filled results
    if (random) {
      // OPTIMIZED: Reduced from 500 to limit * 2 for variety without excessive egress
      // Using a random-ish sort order by sorting by created_at with a variable limit
      query = query.limit(Math.min(limit * 2, 200));
    } else {
      // Sort by created_at (newer first) for non-random mode
      // OPTIMIZED: Reduced from limit * 5 to limit * 1.5 to minimize egress
      // Still ensures enough questions after filtering without fetching excessive data
      const fetchLimit = Math.min(Math.max(limit * 1.5, 20), 300);
      query = query.limit(fetchLimit).order('created_at', { ascending: false });
    }

    // Execute the query to get all matching questions
    const { data: allQuestions, error: queryError, count: totalCount } = await query;

    if (queryError) {
      console.error('[Question Bank API] Supabase error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch questions from database' },
        { status: 500 }
      );
    }

    // Subject filtering is now done via SQL query above, so no need for in-memory filtering
    let filteredQuestions = allQuestions || [];

    // Apply attempted status and attempt result filters after fetching
    const beforeFilterCount = filteredQuestions.length;
    
    // Apply attemptedStatus filter first
    if (attemptedStatus && attemptedStatus !== 'Mix' && userId) {
      if (attemptedStatus === 'New') {
        // Exclude questions the user has attempted
        const attemptedSet = new Set(attemptedQuestionIds);
        filteredQuestions = filteredQuestions.filter(
          (q: any) => !attemptedSet.has(q.id)
        );
      } else if (attemptedStatus === 'Attempted') {
        // Only include questions the user has attempted
        const attemptedSet = new Set(attemptedQuestionIds);
        filteredQuestions = filteredQuestions.filter(
          (q: any) => attemptedSet.has(q.id)
        );
      }
    }
    
    // Apply attemptResult filter
    if (attemptResults.length > 0 && userId) {
      const attemptedSet = new Set(attemptedQuestionIds);
      const incorrectSet = new Set(incorrectQuestionIds);
      
      const resultFilters: ((q: any) => boolean)[] = [];
      
      attemptResults.forEach(result => {
        if (result === 'Unseen') {
          resultFilters.push((q: any) => !attemptedSet.has(q.id));
        } else if (result === 'Mixed Results') {
          resultFilters.push((q: any) => attemptedSet.has(q.id));
        } else if (result === 'Incorrect Before') {
          resultFilters.push((q: any) => incorrectSet.has(q.id));
        }
      });
      
      if (resultFilters.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => 
          resultFilters.some(filter => filter(q))
        );
      }
    }

    // Shuffle BEFORE slicing for random mode
    if (random) {
      filteredQuestions = shuffleArray(filteredQuestions);
    }

    // Apply pagination after filtering and shuffling
    const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);
    
    // The count we return should be the total count matching the filters in the database
    const count = (attemptedStatus && attemptedStatus !== 'Mix') || attemptResults.length > 0 || tags
      ? filteredQuestions.length
      : (totalCount !== null ? totalCount : filteredQuestions.length);

    console.log(`[Question Bank API] Final result: ${filteredQuestions.length} questions after all filtering`, {
      testType: testType || 'All',
      subjects: subjects.length > 0 ? subjects : 'All',
      difficulties: difficulties.length > 0 ? difficulties : 'All',
      attemptResults: attemptResults.length > 0 ? attemptResults : 'None',
      attemptedStatus,
      tags,
      fetchedFromDB: allQuestions?.length || 0,
      afterFilters: filteredQuestions.length,
      attemptedIdsCount: attemptedQuestionIds.length,
      totalCountFromSupabase: totalCount
    });
    
    // If filtering by "New" and we got 0 questions, but we fetched questions, it means all were attempted
    if (attemptedStatus === 'New' && filteredQuestions.length === 0 && allQuestions && allQuestions.length > 0) {
      console.warn(`[Question Bank API] All ${allQuestions.length} fetched questions were already attempted.`, {
        attemptedQuestionIds: attemptedQuestionIds.slice(0, 10), // Log first 10 for debugging
        totalAttempted: attemptedQuestionIds.length,
        fetchedQuestionIds: allQuestions.slice(0, 5).map((q: any) => q.id) // Log first 5 for debugging
      });
    }
    
    if (paginatedQuestions && paginatedQuestions.length > 0) {
      const sample = paginatedQuestions[0] as any;
      console.log('[Question Bank API] Data sample:', {
        id: sample.id,
        schema_id: sample.schema_id,
        paper: sample.paper,
        primary_tag: sample.primary_tag
      });
    } else {
      console.warn(`[Question Bank API] NO QUESTIONS FOUND for testType: ${testType || 'All'}, subjects: ${subjects.length > 0 ? subjects.join(', ') : 'All'}, difficulties: ${difficulties.length > 0 ? difficulties.join(', ') : 'All'}, attemptResults: ${attemptResults.length > 0 ? attemptResults.join(', ') : 'None'}, attemptedStatus: ${attemptedStatus}. Check if questions match the filters.`);
    }

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
        // Return question with original data if parsing fails
        return q;
      }
    });

    // Sort questions by status priority if not random
    let finalQuestions = questions;
    if (random) {
      finalQuestions = shuffleArray(questions).slice(0, limit);
    } else {
      // Sort: pending_review and needs_revision first, then approved
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
        
        // If same status, sort by created_at (newer first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return NextResponse.json({
      questions: finalQuestions,
      count: count,
      totalCount: totalCount || 0
    });
  } catch (error) {
    console.error('[Question Bank API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get schema_id prefix for a given subject
 */
function getSchemaPrefix(subject: SubjectFilter): string | null {
  switch (subject) {
    case 'Math 1':
      return 'MATH1-';
    case 'Math 2':
      return 'MATH2-';
    case 'Physics':
      return 'PHYS-';
    case 'Chemistry':
      return 'CHEM-';
    case 'Biology':
      return 'BIO-';
    default:
      return null;
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


