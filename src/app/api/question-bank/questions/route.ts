import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { SubjectFilter, DifficultyFilter } from '@/types/questionBank';

/**
 * GET /api/question-bank/questions
 * Fetches questions with optional filtering
 * Query params: subject, difficulty, tags, limit, offset, random
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Get filter parameters
    const subject = searchParams.get('subject') as SubjectFilter | null;
    const difficulty = searchParams.get('difficulty') as DifficultyFilter | null;
    const tags = searchParams.get('tags') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const random = searchParams.get('random') === 'true';

    // Build query
    let query = supabase
      .from('ai_generated_questions')
      .select('*')
      .eq('status', 'approved'); // Only show approved questions

    // Apply subject filter
    if (subject && subject !== 'All') {
      // Use schema_id pattern matching based on subject
      const schemaPrefix = getSchemaPrefix(subject);
      if (schemaPrefix) {
        query = query.like('schema_id', `${schemaPrefix}%`);
      }
    }

    // Apply difficulty filter
    if (difficulty && difficulty !== 'All') {
      query = query.eq('difficulty', difficulty);
    }

    // Apply tag filter (search in primary_tag and secondary_tags)
    if (tags) {
      const tagLower = tags.toLowerCase();
      query = query.or(
        `primary_tag.ilike.%${tagLower}%,secondary_tags.cs.{${tagLower}}`
      );
    }

    // Apply random ordering or default ordering
    if (random) {
      // For random, we'll fetch more and shuffle client-side for better randomness
      query = query.limit(limit * 2);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[Question Bank API] Error fetching questions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    // Parse options JSONB to proper format
    const questions = (data || []).map((q: any) => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    // If random, shuffle the results
    let finalQuestions = questions;
    if (random) {
      finalQuestions = shuffleArray(questions).slice(0, limit);
    }

    return NextResponse.json({
      questions: finalQuestions,
      count: finalQuestions.length,
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

