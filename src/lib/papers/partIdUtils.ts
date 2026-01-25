/**
 * Part ID generation and parsing utilities
 * Generates unique IDs for tracking completion of individual parts/sections
 * 
 * ID Format: {ExamName}-{Year}-{Section/Paper}-{Part/Subject}
 * Examples:
 * - NSAA-2023-Section1-Mathematics
 * - NSAA-2016-Section1-PartA
 * - TMUA-2023-Paper1
 */

import type { ExamName, ExamType, PaperSection } from '@/types/papers';
import { mapPartToSection } from './sectionMapping';

/**
 * Normalize a string for use in IDs (remove spaces, special chars, etc.)
 */
function normalizeForId(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .replace(/^Part/i, '') // Remove "Part" prefix
    .replace(/^Section/i, '') // Remove "Section" prefix
    .replace(/^Paper/i, '') // Remove "Paper" prefix
    .replace(/^Sec/i, '') // Remove "Sec" prefix
    .replace(/^S(\d+)/i, '$1'); // Convert "S1" to "1", "S2" to "2"
}

/**
 * Generate a part ID for roadmap parts
 * 
 * @param examName - Exam name (e.g., "NSAA", "ENGAA")
 * @param year - Exam year (e.g., 2023)
 * @param sectionName - Section name from roadmap (e.g., "Section 1", "Section 2")
 * @param partLetter - Part letter (e.g., "Part A", "A")
 * @param partName - Part name (e.g., "Mathematics", "Physics")
 * @param examType - Exam type (e.g., "Official", "Specimen")
 * @returns Part ID string (e.g., "NSAA-2023-Section1-Mathematics")
 */
export function generatePartId(
  examName: ExamName | string,
  year: number | string,
  sectionName: string,
  partLetter: string | null | undefined,
  partName: string | null | undefined,
  examType: ExamType | string
): string {
  const normalizedExam = String(examName).trim();
  const normalizedYear = String(year).trim();
  const normalizedSection = normalizeForId(sectionName);
  const normalizedPartLetter = partLetter ? normalizeForId(partLetter) : '';
  const normalizedPartName = partName ? normalizeForId(partName) : '';
  
  // For NSAA/ENGAA: Use section name and part name
  // For TMUA: sectionName is "Paper 1" or "Paper 2", use that directly
  if (normalizedExam === 'TMUA') {
    // TMUA: ExamName-Year-PaperNumber
    const paperNum = normalizedSection.replace(/[^0-9]/g, '') || '1';
    return `${normalizedExam}-${normalizedYear}-Paper${paperNum}`;
  }
  
  // For NSAA/ENGAA: Use the part name (subject) as the identifier
  // This ensures "NSAA-2023-Section1-Mathematics" is distinct from "NSAA-2023-Section1-Physics"
  const partIdentifier = normalizedPartName || normalizedPartLetter || 'Unknown';
  
  return `${normalizedExam}-${normalizedYear}-${normalizedSection}-${partIdentifier}`;
}

/**
 * Generate a section ID for library sections
 * Used when starting a session from the library
 * 
 * @param examName - Exam name (e.g., "NSAA", "TMUA")
 * @param year - Exam year (e.g., 2023)
 * @param paperName - Paper name from database (e.g., "Section 1", "Paper 1")
 * @param section - Section name (e.g., "Mathematics", "Paper 1")
 * @param examType - Exam type (e.g., "Official", "Specimen")
 * @returns Section ID string (e.g., "NSAA-2023-Section1-Mathematics" or "TMUA-2023-Paper1")
 */
export function generateSectionId(
  examName: ExamName | string,
  year: number | string,
  paperName: string,
  section: PaperSection | string,
  examType: ExamType | string
): string {
  const normalizedExam = String(examName).trim();
  const normalizedYear = String(year).trim();
  const normalizedPaperName = normalizeForId(paperName);
  const normalizedSection = normalizeForId(String(section));
  
  // For TMUA: section is "Paper 1" or "Paper 2", use that
  if (normalizedExam === 'TMUA') {
    const paperNum = normalizedSection.replace(/[^0-9]/g, '') || normalizedPaperName.replace(/[^0-9]/g, '') || '1';
    return `${normalizedExam}-${normalizedYear}-Paper${paperNum}`;
  }
  
  // For NSAA/ENGAA: Use paper name (Section 1/2) and section name (subject)
  return `${normalizedExam}-${normalizedYear}-${normalizedPaperName}-${normalizedSection}`;
}

/**
 * Parse a part ID back into its components
 * 
 * @param id - Part ID string (e.g., "NSAA-2023-Section1-Mathematics")
 * @returns Parsed components or null if invalid
 */
export function parsePartId(id: string): {
  examName: string;
  year: string;
  section: string;
  part: string;
} | null {
  const parts = id.split('-');
  if (parts.length < 4) {
    return null;
  }
  
  const examName = parts[0];
  const year = parts[1];
  const section = parts[2];
  const part = parts.slice(3).join('-'); // Handle multi-part identifiers
  
  return {
    examName,
    year,
    section,
    part,
  };
}

/**
 * Normalize part identifiers for comparison
 * Handles variations like "Part A" vs "A", "Section 1" vs "S1", etc.
 * 
 * @param id - Part ID to normalize
 * @returns Normalized ID
 */
export function normalizePartId(id: string): string {
  const parsed = parsePartId(id);
  if (!parsed) {
    return id; // Return as-is if can't parse
  }
  
  // Reconstruct with normalized components
  return `${parsed.examName}-${parsed.year}-${normalizeForId(parsed.section)}-${normalizeForId(parsed.part)}`;
}

/**
 * Generate part IDs from a roadmap part
 * 
 * @param examName - Exam name
 * @param year - Exam year
 * @param part - Roadmap part
 * @returns Part ID
 */
export function generatePartIdFromRoadmapPart(
  examName: ExamName,
  year: number,
  part: { partLetter: string; partName: string; paperName: string; examType: ExamType }
): string {
  return generatePartId(
    examName,
    year,
    part.paperName,
    part.partLetter,
    part.partName,
    part.examType
  );
}

/**
 * Generate part IDs from selected sections (library)
 * For NSAA/ENGAA: Each section maps to a part ID
 * For TMUA: Section is "Paper 1" or "Paper 2"
 * 
 * @param examName - Exam name
 * @param year - Exam year
 * @param paperName - Paper name from database
 * @param sections - Selected sections
 * @param examType - Exam type
 * @returns Array of part IDs
 */
export function generatePartIdsFromSections(
  examName: ExamName | string,
  year: number | string,
  paperName: string,
  sections: PaperSection[],
  examType: ExamType | string
): string[] {
  return sections.map(section => 
    generateSectionId(examName, year, paperName, section, examType)
  );
}



