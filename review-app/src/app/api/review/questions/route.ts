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

    // Apply filters based on paper type following the hierarchy:
    // 1. test_type (ESAT or TMUA)
    // 2. If TMUA: paper column (Paper1 or Paper2)
    // 3. If ESAT: schema_id first character (P=Physics, C=Chemistry, B=Biology, M=Maths)
    // 4. If ESAT Maths: paper column (Math 1 or Math 2)
    
    // Helper function to check if a question matches ESAT subject filters
    const matchesESATSubject = (row: any, subjects: string[]): boolean => {
      if (subjects.length === 0) return true;
      
      const schemaId = (row.schema_id || '').toUpperCase();
      const firstChar = schemaId.charAt(0);
      const paper = row.paper;
      const testType = row.test_type;
      
      // Must be ESAT (not TMUA)
      if (testType === 'TMUA') return false;
      
      return subjects.some(subject => {
        if (subject === 'Physics' && firstChar === 'P') return true;
        if (subject === 'Chemistry' && firstChar === 'C') return true;
        if (subject === 'Biology' && firstChar === 'B') return true;
        if (subject === 'Math 1' && firstChar === 'M' && paper === 'Math 1') return true;
        if (subject === 'Math 2' && firstChar === 'M' && paper === 'Math 2') return true;
        return false;
      });
    };
    
    // Helper function to check if a question matches TMUA paper filters
    const matchesTMUAPaper = (row: any, subjects: string[]): boolean => {
      if (subjects.length === 0) return true;
      
      const paper = row.paper;
      const testType = row.test_type;
      
      // Must be TMUA
      if (testType !== 'TMUA') return false;
      
      return subjects.some(subject => {
        if (subject === 'Paper 1' && paper === 'Paper1') return true;
        if (subject === 'Paper 2' && paper === 'Paper2') return true;
        return false;
      });
    };
    
    // Determine if we need in-memory filtering (complex OR conditions)
    const needsMemoryFilter = (paperType === 'All' && subjects.length > 0) ||
      (paperType === 'ESAT' && subjects.length > 0);
    
    if (needsMemoryFilter) {
      // Fetch all questions matching base status filter, then filter in memory
      // This handles complex OR conditions across different fields
    } else if (paperType === 'TMUA') {
      // TMUA: Filter by test_type first
      query = query.eq('test_type', 'TMUA');
      
      if (subjects.length > 0) {
        // Filter by selected TMUA papers
        const tmuaPapers = subjects
          .filter(s => s === 'Paper 1' || s === 'Paper 2')
          .map(s => s === 'Paper 1' ? 'Paper1' : 'Paper2');
        
        if (tmuaPapers.length > 0) {
          query = query.in('paper', tmuaPapers);
        }
      } else {
        // Show all TMUA (Paper 1 and Paper 2)
        query = query.in('paper', ['Paper1', 'Paper2']);
      }
    } else if (paperType === 'ESAT') {
      // ESAT: Filter by test_type (ESAT or NULL)
      query = query.or('test_type.eq.ESAT,test_type.is.null');
      
      // For ESAT, if subjects are specified, we'll filter in memory
      // because we need to check schema_id prefix AND paper for Math
    }
    
    // For complex filtering, fetch all and filter in memory
    if (needsMemoryFilter) {
      // Fetch all questions matching the base filters (status, test_type if specified)
      const { data: allData, error: allError } = await query;
      
      if (allError) {
        console.error('[Review API] Error fetching questions:', allError);
        return NextResponse.json(
          { error: 'Failed to fetch questions', details: allError.message },
          { status: 500 }
        );
      }
      
      // Filter in memory based on the hierarchy
      const filtered = (allData || []).filter((row: any) => {
        if (paperType === 'All') {
          // Check if question matches any selected subject
          if (row.test_type === 'TMUA') {
            return matchesTMUAPaper(row, subjects);
          } else {
            // ESAT or NULL
            return matchesESATSubject(row, subjects);
          }
        } else if (paperType === 'ESAT') {
          return matchesESATSubject(row, subjects);
        }
        
        return true;
      });
      
      // Apply random ordering if needed
      const processed = random ? shuffleArray(filtered) : filtered;
      
      // Apply pagination
      const paginated = processed.slice(offset, offset + limit);
      
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
        total: processed.length,
      });
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
