import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { normalizeReviewQuestion } from '@/lib/utils';
import type { ReviewQuestion, PaperType } from '@/types/review';

export const dynamic = 'force-dynamic';

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
 * Fetches pending review questions with optional filtering and random ordering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const paperType = searchParams.get('paperType') as PaperType | null;
    const subjectsParam = searchParams.get('subjects');
    const subjects = subjectsParam ? subjectsParam.split(',').filter(s => s.trim()) : [];
    const questionId = searchParams.get('id') as string | null;
    const limit = parseInt(searchParams.get('limit') || '1', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';

    // Build query
    let query = supabase
      .from('ai_generated_questions')
      .select('*', { count: 'exact' });

    // If specific question ID is requested, fetch that one (regardless of status)
    if (questionId) {
      query = query.eq('id', questionId);
    } else {
      // Only fetch pending_review questions if no specific ID requested
      query = query.eq('status', 'pending_review');
    }

    // Apply filters based on paper type
    if (paperType === 'All') {
      // Show all questions, optionally filter by subjects
      if (subjects.length > 0) {
        // Need to check both paper field and primary_tag prefixes for ESAT subjects
        const paperFilter = subjects.filter(s => ['Math 1', 'Math 2', 'Paper 1', 'Paper 2'].includes(s));
        const tagPrefixes: string[] = [];
        if (subjects.includes('Physics')) tagPrefixes.push('P-');
        if (subjects.includes('Chemistry')) tagPrefixes.push('C-');
        if (subjects.includes('Biology')) tagPrefixes.push('biology-');
        if (subjects.includes('Math 1')) tagPrefixes.push('M1-');
        if (subjects.includes('Math 2')) tagPrefixes.push('M2-');
        
        if (paperFilter.length > 0 && tagPrefixes.length > 0) {
          // Build OR condition: paper IN (...) OR primary_tag starts with any prefix
          const orConditions = [
            `paper.in.(${paperFilter.join(',')})`,
            ...tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`)
          ];
          query = query.or(orConditions.join(','));
        } else if (paperFilter.length > 0) {
          query = query.in('paper', paperFilter);
        } else if (tagPrefixes.length > 0) {
          // Use OR with multiple ilike conditions
          const orConditions = tagPrefixes.map(prefix => `primary_tag.ilike.${prefix}%`).join(',');
          query = query.or(orConditions);
        }
      }
      // If no subjects selected, show all questions (no filter needed)
    } else if (paperType === 'TMUA') {
      // TMUA: Show Paper 1 and Paper 2
      if (subjects.length > 0) {
        // Filter by selected TMUA subjects
        query = query.in('paper', subjects);
      } else {
        // Show all TMUA (Paper 1 and Paper 2)
        query = query.in('paper', ['Paper 1', 'Paper 2']);
      }
    } else if (paperType === 'ESAT') {
      // ESAT subjects: Math 1, Math 2, Physics, Chemistry, Biology
      // Note: Physics, Chemistry, Biology may have paper=NULL, so check primary_tag prefixes
      // For complex OR conditions with different field types, we'll filter in memory after fetching
      // This is more reliable than trying to use complex .or() syntax
      // We'll fetch all pending_review questions and filter them
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
            status: row.status || 'pending_review',
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
      query = query.order('created_at', { ascending: true });
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
          status: row.status || 'pending_review',
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
