// @ts-nocheck
/**
 * Supabase query functions for papers and questions
 */

import { supabase, handleSupabaseError } from './client';
import { scaleScore as scaleScoreFromMarkScoring } from '@/lib/papers/markScoring';
import type { Paper, Question, ConversionTable, ConversionRow, ExamName, ExamType } from '@/types/papers';

export const scaleScore = scaleScoreFromMarkScoring;

/** Columns that exist on production `papers` (no created_at / updated_at). */
const PAPER_LIST_SELECT =
  'id, exam_name, exam_year, paper_name, exam_type, has_conversion';

/** Metadata only — for section outlines, basket stats, and completion mapping. */
const QUESTION_PARTS_SELECT =
  'paper_id, part_letter, part_name, exam_type, paper_name, question_number';

export type QuestionPartRow = {
  paperId: number;
  partLetter: string;
  partName: string;
  examType?: string;
  paperName?: string;
  questionNumber: number;
};

function mapQuestionRow(row: Record<string, unknown>): Question {
  return {
    id: row.id as number,
    paperId: row.paper_id as number,
    examName: row.exam_name as Question['examName'],
    examYear: row.exam_year as number,
    paperName: row.paper_name as string,
    partLetter: (row.part_letter as string) ?? '',
    partName: (row.part_name as string) ?? '',
    examType: row.exam_type as string,
    questionNumber: row.question_number as number,
    questionImage: row.question_image as string,
    questionStem: (row.question_stem as string) ?? undefined,
    options: (row.options as Question['options']) ?? undefined,
    diagramAssets: (row.diagram_assets as Question['diagramAssets']) ?? undefined,
    contentFormat: (row.content_format as Question['contentFormat']) ?? 'image',
    solutionImage: (row.solution_image as string) ?? undefined,
    solutionText: (row.solution_text as string) ?? undefined,
    solutionType: row.solution_type as Question['solutionType'],
    answerLetter: row.answer_letter as string,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

function mapQuestionPartRow(row: Record<string, unknown>): QuestionPartRow {
  return {
    paperId: row.paper_id as number,
    partLetter: (row.part_letter as string) ?? '',
    partName: (row.part_name as string) ?? '',
    examType: (row.exam_type as string) ?? undefined,
    paperName: (row.paper_name as string) ?? undefined,
    questionNumber: (row.question_number as number) ?? 0,
  };
}

export async function getQuestionPartsForPaper(
  paperId: number,
): Promise<QuestionPartRow[]> {
  const { data, error } = await supabase
    .from('questions')
    .select(QUESTION_PARTS_SELECT)
    .eq('paper_id', paperId);

  if (error) throw error;
  return (data || []).map((row) =>
    mapQuestionPartRow(row as Record<string, unknown>),
  );
}

export async function getQuestionPartsForPaperIds(
  paperIds: number[],
): Promise<QuestionPartRow[]> {
  if (paperIds.length === 0) return [];

  const { data, error } = await supabase
    .from('questions')
    .select(QUESTION_PARTS_SELECT)
    .in('paper_id', paperIds);

  if (error) throw error;
  return (data || []).map((row) =>
    mapQuestionPartRow(row as Record<string, unknown>),
  );
}

function mapPaperRow(row: Record<string, unknown>): Paper {
  return {
    id: row.id as number,
    examName: row.exam_name as Paper['examName'],
    examYear: row.exam_year as number,
    paperName: row.paper_name as string,
    examType: row.exam_type as Paper['examType'],
    hasConversion: row.has_conversion as boolean,
    createdAt: '',
    updatedAt: '',
  };
}

// Get all available papers
export async function getAvailablePapers() {
  const { data, error } = await supabase
    .from('papers')
    .select(PAPER_LIST_SELECT)
    .order('exam_name')
    .order('exam_year', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to load papers from database');
  }

  return (data || []).map((row) => mapPaperRow(row as Record<string, unknown>));
}

// Get papers by exam name
export async function getPapersByExam(examName: ExamName) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select(PAPER_LIST_SELECT)
      .eq('exam_name', examName)
      .order('exam_year', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => mapPaperRow(row as Record<string, unknown>));
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

// Get papers by exam name and year
export async function getPapersByExamAndYear(examName: ExamName, examYear: number) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select(PAPER_LIST_SELECT)
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .order('paper_name');

    if (error) throw error;

    return (data || []).map((row) => mapPaperRow(row as Record<string, unknown>));
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

// Get specific paper with fallback to try common name variations
export async function getPaper(examName: ExamName, examYear: number, paperName: string, examType: ExamType) {
  try {
    // First try exact match
    const { data, error } = await supabase
      .from('papers')
      .select(PAPER_LIST_SELECT)
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .eq('paper_name', paperName)
      .eq('exam_type', examType)
      .single();

    if (!error && data) {
      return mapPaperRow(data as Record<string, unknown>);
    }

    // If exact match fails, try common variations for NSAA/ENGAA
    if (examName === 'NSAA' || examName === 'ENGAA') {
      const variations = [
        paperName, // Original
        paperName.replace(/\s+/g, ''), // "Section 1" -> "Section1"
        paperName.toLowerCase(), // "Section 1" -> "section 1"
        paperName.toUpperCase(), // "Section 1" -> "SECTION 1"
        paperName.replace(/\s+/g, '').toLowerCase(), // "Section 1" -> "section1"
      ];

      for (const variant of variations) {
        if (variant === paperName) continue; // Already tried
        
        const { data: variantData, error: variantError } = await supabase
          .from('papers')
          .select(PAPER_LIST_SELECT)
          .eq('exam_name', examName)
          .eq('exam_year', examYear)
          .eq('paper_name', variant)
          .eq('exam_type', examType)
          .single();

        if (!variantError && variantData) {
          return mapPaperRow(variantData as Record<string, unknown>);
        }
      }
    }

    // If all variations fail, log and return null
    handleSupabaseError(error);
    return null;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
}

/**
 * Get all questions for a paper
 * 
 * IMPORTANT: This function ONLY returns REAL exam questions from past papers.
 * - Questions come from the 'questions' table (uploaded from PDF past papers)
 * - Does NOT include AI-generated questions (those are in 'ai_generated_questions' table)
 * - Does NOT include fake/simulated questions (those are only documentation examples)
 * 
 * @param paperId - The ID of the paper to get questions for
 * @returns Array of real exam questions from past papers
 */
export async function getQuestions(paperId: number) {
  try {
    
    // CRITICAL: Only query 'questions' table - these are real past paper questions
    // Do NOT query 'ai_generated_questions' - those are simulated/AI-generated
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('paper_id', paperId)
      .order('question_number');

    
    // Log exam info from first question to verify paper type
    if (data && data.length > 0) {
      const firstQ = data[0];
    }

    if (error) throw error;
    
    // Convert database format to TypeScript interface format
    const questions: Question[] = (data || []).map((row: any) => mapQuestionRow(row));
    
    return questions;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

// Get single question
export async function getQuestion(paperId: number, questionNumber: number) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('paper_id', paperId)
      .eq('question_number', questionNumber)
      .single();

    if (error) throw error;
    
    // Convert database format to TypeScript interface format
    const question: Question = mapQuestionRow(data);
    
    return question;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
}

// Get conversion table for a paper
export async function getConversionTable(paperId: number) {
  try {
    // First, verify the paper exists and get its exam info
    const { data: paperData, error: paperError } = await supabase
      .from('papers')
      .select('id, exam_name, exam_year, paper_name, exam_type')
      .eq('id', paperId)
      .single();

    if (paperError) {
      throw paperError;
    }


    // Now get the conversion table
    const { data, error } = await supabase
      .from('conversion_tables')
      .select('*')
      .eq('paper_id', paperId)
      .single();

    if (error) throw error;

    // Verify the conversion table's paper_id matches the paper we're looking for
    if (data.paper_id !== paperId) {
      return null;
    }

    // Convert database format to TypeScript interface format
    const conversionTable: ConversionTable = {
      id: data.id,
      paperId: data.paper_id,
      displayName: data.display_name,
      sourcePdfUrl: data.source_pdf_url,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    
    return conversionTable;
  } catch (error: any) {
    // Swallow "no rows" so callers can attempt fallbacks; log others
    const code = error?.code || error?.status || '';
    if (code === 'PGRST116' || /single/i.test(error?.message || '')) {
      return null;
    }
    return null;
  }
}

// Get conversion rows for a table
export async function getConversionRows(tableId: number) {
  try {
    const { data, error } = await supabase
      .from('conversion_rows')
      .select('*')
      .eq('table_id', tableId)
      .order('part_name')
      .order('raw_score');

    if (error) throw error;
    // Convert database format to TypeScript interface format
    const conversionRows: ConversionRow[] = (data || []).map((row: any) => ({
      id: row.id,
      tableId: row.table_id,
      partName: row.part_name,
      rawScore: row.raw_score,
      scaledScore: row.scaled_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    return conversionRows;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

/** Load conversion rows keyed by paper id (for multi-section NSAA/ENGAA sessions). */
export async function loadConversionRowsByPaperIds(
  paperIds: number[],
): Promise<Map<number, ConversionRow[]>> {
  const result = new Map<number, ConversionRow[]>();
  const uniqueIds = [...new Set(paperIds.filter((id) => Number.isFinite(id)))];

  for (const paperId of uniqueIds) {
    const table = await getConversionTable(paperId);
    if (!table) continue;
    const rows = await getConversionRows(table.id);
    if (rows.length > 0) {
      result.set(paperId, rows);
    }
  }

  return result;
}

// Find a fallback conversion table for the same exam, year, and exam type when the current paper lacks one
export async function findFallbackConversionTable(examName: ExamName, examYear: number, examType?: ExamType) {
  try {
    
    // Build query: same exam and year, and optionally same exam type
    let query = supabase
      .from('papers')
      .select('id, paper_name, exam_type, has_conversion')
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .eq('has_conversion', true);
    
    // If examType is provided, filter by it to find same-type papers (e.g., "Official")
    if (examType) {
      query = query.eq('exam_type', examType);
    }
    
    query = query.order('paper_name');
    
    const { data: papers, error } = await query;

    if (error) throw error;
    if (!papers || papers.length === 0) {
      return null;
    }

    // Return the first actual conversion table we can load
    for (const p of papers) {
      const table = await getConversionTable(p.id);
      if (table) {
        // Double-check: verify the table's paper belongs to the correct exam
        const { data: paperVerify } = await supabase
          .from('papers')
          .select('exam_name, exam_year, paper_name, exam_type')
          .eq('id', table.paperId)
          .single();
        
        if (paperVerify) {
          const tableExamName = (paperVerify.exam_name || '').toUpperCase();
          const requestedExamName = (examName || '').toUpperCase();
          if (tableExamName !== requestedExamName) {
            continue; // Skip this table, it's for the wrong exam
          }
        }
        return table;
      }
    }
    return null;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
}

// Get available exam names
export async function getAvailableExamNames() {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('exam_name')
      .order('exam_name');

    if (error) throw error;
    
    // Get unique exam names
    const uniqueNames = [...new Set((data || []).map((row: any) => row.exam_name))];
    return uniqueNames as ExamName[];
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

// Get available years for an exam
export async function getAvailableYears(examName: ExamName) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('exam_year')
      .eq('exam_name', examName)
      .order('exam_year', { ascending: false });

    if (error) throw error;
    
    // Get unique years
    const uniqueYears = [...new Set((data || []).map((row: any) => row.exam_year))];
    return uniqueYears;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

// Get available paper names for an exam and year
export async function getAvailablePaperNames(examName: ExamName, examYear: number) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('paper_name')
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .order('paper_name');

    if (error) throw error;
    
    // Get unique paper names
    const uniqueNames = [...new Set((data || []).map((row: any) => row.paper_name))];
    return uniqueNames;
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}

// Get available exam types for an exam, year, and paper
export async function getAvailableExamTypes(examName: ExamName, examYear: number, paperName: string) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('exam_type')
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .eq('paper_name', paperName)
      .order('exam_type');

    if (error) throw error;
    
    // Get unique exam types
    const uniqueTypes = [...new Set((data || []).map((row: any) => row.exam_type))];
    return uniqueTypes as ExamType[];
  } catch (error) {
    handleSupabaseError(error);
    throw error;
  }
}