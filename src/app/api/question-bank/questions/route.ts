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
    const subjectParam = searchParams.get('subject');
    const subjects = subjectParam ? subjectParam.split(',').filter(s => s && s !== 'All') as SubjectFilter[] : [];
    const difficultyParam = searchParams.get('difficulty');
    const difficulties = difficultyParam ? difficultyParam.split(',').filter(d => d && d !== 'All') as DifficultyFilter[] : [];
    const attemptResultParam = searchParams.get('attemptResult');
    const attemptResults = attemptResultParam ? attemptResultParam.split(',') as AttemptResultFilter[] : [];
    const attemptedStatus = searchParams.get('attemptedStatus') as AttemptedFilter | null;
    const tags = searchParams.get('tags') || '';
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

    // Build query
    let query = supabase
      .from('ai_generated_questions')
      .select('*');
    
    // Note: attemptResult filtering will be applied after fetching attempts

    // Apply subject filter (OR logic for multiple subjects)
    if (subjects.length > 0) {
      console.log('[Question Bank API] Incoming subject filters:', subjects);
      
      const subjectConditions: string[] = [];
      subjects.forEach(subject => {
      if (subject === 'Math 1') {
        // Math 1: paper column is "Math 1" OR primary_tag starts with "M1-" OR schema_id is "M1" (fallback)
          subjectConditions.push('paper.eq.Math 1');
          subjectConditions.push('primary_tag.ilike.M1-%');
          subjectConditions.push('schema_id.eq.M1');
      } else if (subject === 'Math 2') {
        // Math 2: paper column is "Math 2" OR primary_tag starts with "M2-" OR schema_id is M2, M3, M4, or M5 (fallback)
          subjectConditions.push('paper.eq.Math 2');
          subjectConditions.push('primary_tag.ilike.M2-%');
          subjectConditions.push('schema_id.in.(M2,M3,M4,M5)');
      } else if (subject === 'Physics') {
        // Physics: schema_id starts with P OR primary_tag starts with P-
          subjectConditions.push('schema_id.ilike.P%');
          subjectConditions.push('primary_tag.ilike.P-%');
      } else if (subject === 'Chemistry') {
        // Chemistry: schema_id starts with C OR primary_tag starts with chemistry-
          subjectConditions.push('schema_id.ilike.C%');
          subjectConditions.push('primary_tag.ilike.chemistry-%');
      } else if (subject === 'Biology') {
        // Biology: schema_id starts with B OR primary_tag starts with biology-
          subjectConditions.push('schema_id.ilike.B%');
          subjectConditions.push('primary_tag.ilike.biology-%');
        }
      });
      
      if (subjectConditions.length > 0) {
        // Use OR to combine all subject conditions
        query = query.or(subjectConditions.join(','));
      }
    }

    // Apply difficulty filter (OR logic for multiple difficulties)
    if (difficulties.length > 0) {
      if (difficulties.length === 1) {
        query = query.eq('difficulty', difficulties[0]);
      } else {
        // Multiple difficulties: use OR logic
        const difficultyConditions = difficulties.map(d => `difficulty.eq.${d}`).join(',');
        query = query.or(difficultyConditions);
      }
    }

    // Apply tag filter (search in primary_tag and secondary_tags)
    if (tags) {
      const tagLower = tags.toLowerCase();
      query = query.or(
        `primary_tag.ilike.%${tagLower}%,secondary_tags.cs.{${tagLower}}`
      );
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

    // Apply ordering
    // When filtering by "New", we need to fetch more questions since some will be filtered out
    const fetchLimit = attemptedStatus === 'New' && userId 
      ? limit * 10  // Fetch 10x more when filtering for new questions
      : random 
        ? limit * 2  // Fetch 2x for random
        : limit * 2;  // Default to 2x for better coverage
    
    if (random) {
      // For random, we'll fetch more and shuffle client-side for better randomness
      query = query.limit(fetchLimit);
    } else {
      // Sort by status priority (pending_review and approved first), then by created_at
      // We'll do this client-side after fetching since Supabase doesn't support custom sort orders easily
      query = query.limit(fetchLimit).order('created_at', { ascending: false });
    }

    // Execute the query to get all matching questions
    const { data: allQuestions, error: queryError } = await query;

    if (queryError) {
      console.error('[Question Bank API] Supabase error:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch questions from database' },
        { status: 500 }
      );
    }

    // Apply attempted status and attempt result filters after fetching
    let filteredQuestions = allQuestions || [];
    const beforeFilterCount = filteredQuestions.length;
    
    // Apply attemptedStatus filter first
    if (attemptedStatus && attemptedStatus !== 'Mix' && userId) {
      console.log(`[Question Bank API] Filtering by attemptedStatus: ${attemptedStatus}`, {
        userId,
        attemptedQuestionIdsCount: attemptedQuestionIds.length,
        questionsBeforeFilter: beforeFilterCount
      });
      
      if (attemptedStatus === 'New') {
        // Exclude questions the user has attempted
        const attemptedSet = new Set(attemptedQuestionIds);
        filteredQuestions = filteredQuestions.filter(
          (q: any) => !attemptedSet.has(q.id)
        );
        console.log(`[Question Bank API] After "New" filter: ${filteredQuestions.length} questions`);
      } else if (attemptedStatus === 'Attempted') {
        // Only include questions the user has attempted
        if (attemptedQuestionIds.length === 0) {
          console.log(`[Question Bank API] User has no attempts, returning empty result`);
          return NextResponse.json({
            questions: [],
            count: 0,
          });
        }
        const attemptedSet = new Set(attemptedQuestionIds);
        filteredQuestions = filteredQuestions.filter(
          (q: any) => attemptedSet.has(q.id)
        );
        console.log(`[Question Bank API] After "Attempted" filter: ${filteredQuestions.length} questions`);
      }
    }
    
    // Apply attemptResult filter
    if (attemptResults.length > 0 && userId) {
      const beforeAttemptResultCount = filteredQuestions.length;
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
      
      // Apply OR logic: question matches if it matches any of the selected result filters
      if (resultFilters.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => 
          resultFilters.some(filter => filter(q))
        );
      }
      
      console.log(`[Question Bank API] After attemptResult filter (${attemptResults.join(', ')}): ${filteredQuestions.length} questions (from ${beforeAttemptResultCount})`);
    }

    // Apply pagination after filtering
    const paginatedQuestions = filteredQuestions.slice(offset, offset + limit);
    const count = filteredQuestions.length;

    console.log(`[Question Bank API] Final result: ${filteredQuestions.length} questions after all filtering`, {
      subjects: subjects.length > 0 ? subjects : 'All',
      difficulties: difficulties.length > 0 ? difficulties : 'All',
      attemptResults: attemptResults.length > 0 ? attemptResults : 'None',
      attemptedStatus,
      tags,
      fetchedFromDB: allQuestions?.length || 0,
      afterFilters: filteredQuestions.length,
      attemptedIdsCount: attemptedQuestionIds.length
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
      console.warn(`[Question Bank API] NO QUESTIONS FOUND for subjects: ${subjects.length > 0 ? subjects.join(', ') : 'All'}, difficulties: ${difficulties.length > 0 ? difficulties.join(', ') : 'All'}, attemptResults: ${attemptResults.length > 0 ? attemptResults.join(', ') : 'None'}, attemptedStatus: ${attemptedStatus}. Check if questions match the filters.`);
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

