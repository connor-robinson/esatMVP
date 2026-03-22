/**
 * Utility functions
 */

import { type ClassValue, clsx } from "clsx";
import type { ReviewQuestion } from "@/types/review";

/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const o = JSON.parse(value) as unknown;
      if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function parseStringArray(value: unknown): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map((x) => String(x)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const a = JSON.parse(value) as unknown;
      if (Array.isArray(a)) return a.map((x) => String(x)).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * TMUA pipeline stores designer topic codes on idea_plan (section1_* / section2_*).
 * DB columns primary_tag / secondary_tags are only filled when the Tag Labeler station
 * runs and succeeds; this fills display gaps from idea_plan without overwriting real tags.
 */
function tmuaTopicFallbackFromIdeaPlan(
  ideaPlanRaw: unknown,
  schemaId: string
): { primary: string | null; secondary: string[] | null } {
  const ip = parseJsonObject(ideaPlanRaw);
  if (!ip) return { primary: null, secondary: null };

  const paperRaw = ip.paper;
  const paperStr =
    typeof paperRaw === "string" ? paperRaw.toLowerCase().replace(/\s/g, "") : "";
  const isPaper2 =
    schemaId.startsWith("R_") ||
    paperStr === "paper2" ||
    paperStr === "paper 2";

  if (isPaper2) {
    const p = ip.section2_primary_tag;
    const s = ip.section2_secondary_tags;
    return {
      primary: typeof p === "string" && p ? p : null,
      secondary: parseStringArray(s),
    };
  }

  const p = ip.section1_primary_tag;
  const s = ip.section1_secondary_tags;
  return {
    primary: typeof p === "string" && p ? p : null,
    secondary: parseStringArray(s),
  };
}

function rowLooksTmua(data: { test_type?: string | null; schema_id?: string }): boolean {
  if (data.test_type === "TMUA") return true;
  const sid = data.schema_id || "";
  return sid.startsWith("M_") || sid.startsWith("R_");
}

/**
 * Normalize a ReviewQuestion by ensuring all required fields exist with defaults
 * Parses JSONB fields and provides fallbacks for missing data
 */
export function normalizeReviewQuestion(data: any): ReviewQuestion {
  // Parse JSONB fields if they're strings
  let options: Record<string, string> = {};
  if (data.options) {
    if (typeof data.options === 'string') {
      try {
        options = JSON.parse(data.options);
      } catch (e) {
        console.warn('[normalizeReviewQuestion] Failed to parse options:', e);
        options = {};
      }
    } else if (typeof data.options === 'object' && data.options !== null) {
      options = data.options;
    }
  }
  
  // Ensure options is always an object, never null
  if (!options || typeof options !== 'object') {
    options = {};
  }

  let distractor_map: Record<string, string> | null = null;
  if (data.distractor_map) {
    if (typeof data.distractor_map === 'string') {
      try {
        distractor_map = JSON.parse(data.distractor_map);
      } catch (e) {
        console.warn('[normalizeReviewQuestion] Failed to parse distractor_map:', e);
        distractor_map = null;
      }
    } else if (typeof data.distractor_map === 'object' && data.distractor_map !== null) {
      distractor_map = data.distractor_map;
    }
  }

  let primary_tag: string | null =
    typeof data.primary_tag === "string" && data.primary_tag.trim() ? data.primary_tag.trim() : null;
  let secondary_tags: string[] | null = parseStringArray(data.secondary_tags);

  if (rowLooksTmua(data)) {
    const missingPrimary = !primary_tag;
    const missingSecondary = !secondary_tags || secondary_tags.length === 0;
    if (missingPrimary || missingSecondary) {
      const fb = tmuaTopicFallbackFromIdeaPlan(data.idea_plan, data.schema_id || "");
      if (missingPrimary && fb.primary) primary_tag = fb.primary;
      if (missingSecondary && fb.secondary && fb.secondary.length > 0) secondary_tags = fb.secondary;
    }
  }

  // Return normalized question with all required fields
  return {
    id: data.id || '',
    generation_id: data.generation_id || '',
    schema_id: data.schema_id || '',
    difficulty: data.difficulty || 'Medium',
    question_stem: data.question_stem || '',
    options: options,
    correct_option: data.correct_option || 'A',
    solution_reasoning: data.solution_reasoning || null,
    solution_key_insight: data.solution_key_insight || null,
    distractor_map: distractor_map,
    subjects: data.subjects || null, // Renamed from 'paper'
    primary_tag,
    secondary_tags,
    test_type: data.test_type || null, // ESAT, TMUA, or NULL
    is_good_question: data.is_good_question === true, // Default to false
    status: data.status || 'pending', // Updated default status
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
  };
}

/**
 * Validate that a ReviewQuestion has all required fields
 */
export function validateReviewQuestion(question: any): question is ReviewQuestion {
  if (!question) return false;
  
  // Check required fields
  if (!question.id || typeof question.id !== 'string') return false;
  if (!question.generation_id || typeof question.generation_id !== 'string') return false;
  if (!question.schema_id || typeof question.schema_id !== 'string') return false;
  if (!question.question_stem || typeof question.question_stem !== 'string') return false;
  if (!question.options || typeof question.options !== 'object') return false;
  if (!question.correct_option || typeof question.correct_option !== 'string') return false;
  
  // Validate difficulty
  const validDifficulties = ['Easy', 'Medium', 'Hard', 'Extreme'];
  if (!validDifficulties.includes(question.difficulty)) return false;
  
  // Validate status
  const validStatuses = ['pending', 'approved', 'deleted'];
  if (!validStatuses.includes(question.status)) return false;
  
  return true;
}

/**
 * Strip HTML tags for plain-text previews (e.g. dashboard cards).
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}



