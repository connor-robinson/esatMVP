// @ts-nocheck
/**
 * Supabase query functions for papers and questions
 */

import { supabase, handleSupabaseError } from './client';
import type { Paper, Question, ConversionTable, ConversionRow, ExamName, ExamType } from '@/types/papers';

// Get all available papers
export async function getAvailablePapers() {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .order('exam_name')
      .order('exam_year', { ascending: false });

    if (error) throw error;
    
    // Convert database format to TypeScript interface format
    const papers: Paper[] = (data || []).map((row: any) => ({
      id: row.id,
      examName: row.exam_name,
      examYear: row.exam_year,
      paperName: row.paper_name,
      examType: row.exam_type,
      hasConversion: row.has_conversion,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    return papers;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

// Get papers by exam name
export async function getPapersByExam(examName: ExamName) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('exam_name', examName)
      .order('exam_year', { ascending: false });

    if (error) throw error;
    // Convert database format to TypeScript interface format
    const papers: Paper[] = (data || []).map((row: any) => ({
      id: row.id,
      examName: row.exam_name,
      examYear: row.exam_year,
      paperName: row.paper_name,
      examType: row.exam_type,
      hasConversion: row.has_conversion,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    return papers;
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
      .select('*')
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .order('paper_name');

    if (error) throw error;
    // Convert database format to TypeScript interface format
    const papers: Paper[] = (data || []).map((row: any) => ({
      id: row.id,
      examName: row.exam_name,
      examYear: row.exam_year,
      paperName: row.paper_name,
      examType: row.exam_type,
      hasConversion: row.has_conversion,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    return papers;
  } catch (error) {
    handleSupabaseError(error);
    return [];
  }
}

// Get specific paper
export async function getPaper(examName: ExamName, examYear: number, paperName: string, examType: ExamType) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('*')
      .eq('exam_name', examName)
      .eq('exam_year', examYear)
      .eq('paper_name', paperName)
      .eq('exam_type', examType)
      .single();

    if (error) throw error;
    // Convert database format to TypeScript interface format
    const paper: Paper = {
      id: data.id,
      examName: data.exam_name,
      examYear: data.exam_year,
      paperName: data.paper_name,
      examType: data.exam_type,
      hasConversion: data.has_conversion,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
    return paper;
  } catch (error) {
    handleSupabaseError(error);
    return null;
  }
}

// Get all questions for a paper
export async function getQuestions(paperId: number) {
  try {
    console.log('=== DEBUG getQuestions ===');
    console.log('paperId:', paperId);
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('paper_id', paperId)
      .order('question_number');

    console.log('Supabase query result:');
    console.log('data:', data);
    console.log('error:', error);
    console.log('data length:', data?.length);

    if (error) throw error;
    
    // Convert database format to TypeScript interface format
    const questions: Question[] = (data || []).map((row: any) => ({
      id: row.id,
      paperId: row.paper_id,
      examName: row.exam_name,
      examYear: row.exam_year,
      paperName: row.paper_name,
      partLetter: row.part_letter, // Convert snake_case to camelCase
      partName: row.part_name, // Convert snake_case to camelCase
      examType: row.exam_type,
      questionNumber: row.question_number,
      questionImage: row.question_image,
      solutionImage: row.solution_image,
      solutionText: row.solution_text,
      solutionType: row.solution_type,
      answerLetter: row.answer_letter,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    console.log('Converted questions:', questions);
    return questions;
  } catch (error) {
    console.error('Error in getQuestions:', error);
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
    const question: Question = {
      id: data.id,
      paperId: data.paper_id,
      examName: data.exam_name,
      examYear: data.exam_year,
      paperName: data.paper_name,
      partLetter: data.part_letter,
      partName: data.part_name,
      examType: data.exam_type,
      questionNumber: data.question_number,
      questionImage: data.question_image,
      solutionImage: data.solution_image,
      solutionText: data.solution_text,
      solutionType: data.solution_type,
      answerLetter: data.answer_letter,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    
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
      console.error('[conversion] Paper not found', { paperId, error: paperError });
      throw paperError;
    }

    console.log('[conversion] Looking up conversion table for paper', { 
      paperId, 
      examName: paperData.exam_name, 
      examYear: paperData.exam_year, 
      paperName: paperData.paper_name,
      examType: paperData.exam_type
    });

    // Now get the conversion table
    const { data, error } = await supabase
      .from('conversion_tables')
      .select('*')
      .eq('paper_id', paperId)
      .single();

    if (error) throw error;

    // Verify the conversion table's paper_id matches the paper we're looking for
    if (data.paper_id !== paperId) {
      console.error('[conversion] Mismatch: conversion table paper_id does not match requested paperId', {
        requestedPaperId: paperId,
        tablePaperId: data.paper_id,
        examName: paperData.exam_name
      });
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

    console.log('[conversion] Found conversion table', { 
      tableId: conversionTable.id, 
      paperId: conversionTable.paperId,
      examName: paperData.exam_name,
      examYear: paperData.exam_year,
      paperName: paperData.paper_name
    });
    
    return conversionTable;
  } catch (error: any) {
    // Swallow "no rows" so callers can attempt fallbacks; log others
    const code = error?.code || error?.status || '';
    if (code === 'PGRST116' || /single/i.test(error?.message || '')) {
      console.warn('[conversion] No conversion table for paperId', paperId);
      return null;
    }
    console.warn('[conversion] getConversionTable failed', { paperId, error });
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

// Find a fallback conversion table for the same exam, year, and exam type when the current paper lacks one
export async function findFallbackConversionTable(examName: ExamName, examYear: number, examType?: ExamType) {
  try {
    console.log('[conversion:fallback] Looking for fallback table', { examName, examYear, examType });
    
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
    console.log('[conversion:fallback] Candidate papers', papers?.map((p: any) => ({ 
      id: p.id, 
      paperName: p.paper_name, 
      examType: p.exam_type 
    })));
    if (!papers || papers.length === 0) {
      console.log('[conversion:fallback] No candidate papers found', { examName, examYear, examType });
      return null;
    }

    // Return the first actual conversion table we can load
    for (const p of papers) {
      const table = await getConversionTable(p.id);
      console.log('[conversion:fallback] Checked paper', { 
        paperId: p.id, 
        paperName: p.paper_name,
        examType: p.exam_type,
        hasTable: !!table, 
        examName, 
        examYear 
      });
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
            console.error('[conversion:fallback] Rejected table - wrong exam', {
              tableId: table.id,
              tablePaperId: table.paperId,
              tableExamName,
              requestedExamName,
              paperData: paperVerify
            });
            continue; // Skip this table, it's for the wrong exam
          }
          console.log('[conversion:fallback] ✅ Verified fallback table', {
            tableId: table.id,
            tablePaperId: table.paperId,
            examName: tableExamName,
            paperName: paperVerify.paper_name,
            examType: paperVerify.exam_type,
            requestedExamType: examType
          });
        }
        return table;
      }
    }
    console.log('[conversion:fallback] No valid conversion table found for', { examName, examYear, examType });
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
    console.error('Error getting available exam names:', error);
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
    console.error(`Error getting available years for ${examName}:`, error);
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
    console.error(`Error getting available paper names for ${examName} ${examYear}:`, error);
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
    console.error(`Error getting available exam types for ${examName} ${examYear} ${paperName}:`, error);
    handleSupabaseError(error);
    throw error;
  }
}

// Helper function to scale a raw score using conversion table
export function scaleScore(
  conversionRows: ConversionRow[], 
  partName: string, 
  rawScore: number, 
  policy: 'clamp' | 'nearest' | 'linear' = 'clamp'
): number | null {
  const partRows = conversionRows.filter(row => row.partName === partName);
  
  if (partRows.length === 0) return null;
  
  // Sort by raw score
  partRows.sort((a, b) => a.rawScore - b.rawScore);
  
  // Find exact match
  const exactMatch = partRows.find(row => row.rawScore === rawScore);
  if (exactMatch) return exactMatch.scaledScore;
  
  // Apply fallback policy
  const minRow = partRows[0];
  const maxRow = partRows[partRows.length - 1];
  
  if (rawScore <= minRow.rawScore) return minRow.scaledScore;
  if (rawScore >= maxRow.rawScore) return maxRow.scaledScore;
  
  if (policy === 'clamp') {
    return rawScore < minRow.rawScore ? minRow.scaledScore : maxRow.scaledScore;
  }
  
  if (policy === 'nearest') {
    const lower = partRows.filter(row => row.rawScore < rawScore).pop();
    const upper = partRows.find(row => row.rawScore > rawScore);
    
    if (!lower) return minRow.scaledScore;
    if (!upper) return maxRow.scaledScore;
    
    const lowerDist = rawScore - lower.rawScore;
    const upperDist = upper.rawScore - rawScore;
    
    return lowerDist <= upperDist ? lower.scaledScore : upper.scaledScore;
  }
  
  if (policy === 'linear') {
    const lower = partRows.filter(row => row.rawScore < rawScore).pop();
    const upper = partRows.find(row => row.rawScore > rawScore);
    
    if (!lower || !upper) return null;
    
    const ratio = (rawScore - lower.rawScore) / (upper.rawScore - lower.rawScore);
    return lower.scaledScore + ratio * (upper.scaledScore - lower.scaledScore);
  }
  
  return null;
}