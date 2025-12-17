/**
 * Analytics calculations for paper sessions
 */

import type { PaperSession, PaperType, MistakeTag, PaperSection } from '@/types/papers';
import type { PaperSessionRow } from '@/lib/supabase/types';

export interface SessionAnalytics {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTime: number;
  averageTime: number;
  scoreTrend: number[];
  mistakeBreakdown: Record<string, number>;
  timeBreakdown: {
    fast: number; // <1 min per question
    medium: number; // 1-3 min per question
    slow: number; // >3 min per question
  };
}

export function calculateSessionAnalytics(sessions: PaperSession[], paperType?: PaperType): SessionAnalytics {
  const filteredSessions = paperType 
    ? sessions.filter(s => s.paperName === paperType)
    : sessions;

  if (filteredSessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      worstScore: 0,
      totalTime: 0,
      averageTime: 0,
      scoreTrend: [],
      mistakeBreakdown: {},
      timeBreakdown: { fast: 0, medium: 0, slow: 0 }
    };
  }

  const scoredSessions = filteredSessions.filter(s => s.score);
  const scores = scoredSessions.map(s => (s.score!.correct / s.score!.total) * 100);
  const times = filteredSessions.map(s => s.timeLimitMinutes);

  // Calculate mistake breakdown
  const mistakeBreakdown: Record<string, number> = {};
  filteredSessions.forEach(session => {
    session.mistakeTags.forEach(tag => {
      if (tag && tag !== "None") {
        mistakeBreakdown[tag] = (mistakeBreakdown[tag] || 0) + 1;
      }
    });
  });

  // Calculate time breakdown per question
  let fastCount = 0, mediumCount = 0, slowCount = 0;
  filteredSessions.forEach(session => {
    session.perQuestionSec.forEach(timeSec => {
      const timeMin = timeSec / 60;
      if (timeMin < 1) fastCount++;
      else if (timeMin <= 3) mediumCount++;
      else slowCount++;
    });
  });

  return {
    totalSessions: filteredSessions.length,
    averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
    worstScore: scores.length > 0 ? Math.min(...scores) : 0,
    totalTime: times.reduce((a, b) => a + b, 0),
    averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    scoreTrend: scores,
    mistakeBreakdown,
    timeBreakdown: { fast: fastCount, medium: mediumCount, slow: slowCount }
  };
}

export function calculateTrend(scores: number[]): 'improving' | 'declining' | 'flat' {
  if (scores.length < 2) return 'flat';
  
  const first = scores[0];
  const last = scores[scores.length - 1];
  const difference = last - first;
  
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'flat';
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function calculateScorePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Convert database PaperSessionRow to PaperSession format
 */
export function convertSessionRow(row: PaperSessionRow): PaperSession {
  const score = row.score as { correct: number; total: number } | null;
  const answers = (row.answers as any[]) || [];
  const perQuestionSec = (row.per_question_seconds as number[]) || [];
  const correctFlags = (row.correct_flags as (boolean | null)[]) || [];
  const guessedFlags = (row.guessed_flags as boolean[]) || [];
  const mistakeTags = (row.mistake_tags as MistakeTag[]) || [];

  return {
    id: row.id,
    paperName: row.paper_name as PaperType,
    paperVariant: row.paper_variant,
    sessionName: row.session_name,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : Date.now(),
    endedAt: row.ended_at ? new Date(row.ended_at).getTime() : undefined,
    timeLimitMinutes: row.time_limit_minutes,
    questionRange: {
      start: row.question_start || 1,
      end: row.question_end || 1,
    },
    selectedSections: (row.selected_sections as PaperSection[]) || [],
    answers: answers.map((a: any) => ({
      choice: a?.choice || null,
      other: a?.other || '',
      correctChoice: a?.correctChoice || null,
      explanation: a?.explanation || '',
      addToDrill: a?.addToDrill || false,
    })),
    perQuestionSec,
    correctFlags,
    guessedFlags,
    mistakeTags,
    score: score || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch user's paper sessions from the API
 */
export async function fetchUserSessions(): Promise<PaperSession[]> {
  try {
    const response = await fetch('/api/papers/sessions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const data = await response.json();
    const sessions = (data.sessions || []) as PaperSessionRow[];
    
    return sessions.map(convertSessionRow);
  } catch (error) {
    console.error('[analytics] Failed to fetch sessions', error);
    return [];
  }
}

/**
 * Filter sessions by paper type, section, and time range
 */
export function filterSessions(
  sessions: PaperSession[],
  options: {
    paperType?: PaperType | 'ALL';
    section?: PaperSection | 'ALL';
    timeRange?: 'week' | 'month' | 'quarter' | 'all';
  }
): PaperSession[] {
  let filtered = [...sessions];

  // Filter by paper type
  if (options.paperType && options.paperType !== 'ALL') {
    filtered = filtered.filter(s => s.paperName === options.paperType);
  }

  // Filter by section
  if (options.section && options.section !== 'ALL') {
    filtered = filtered.filter(s => 
      s.selectedSections?.includes(options.section as PaperSection) || false
    );
  }

  // Filter by time range
  if (options.timeRange && options.timeRange !== 'all') {
    const now = Date.now();
    const cutoffMap = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
    };
    const cutoff = cutoffMap[options.timeRange];
    filtered = filtered.filter(s => {
      const sessionTime = s.startedAt || 0;
      return (now - sessionTime) <= cutoff;
    });
  }

  return filtered;
}

/**
 * Calculate trend data for graph visualization
 * Returns array of { date: number, percentage: number } sorted by date
 */
export function calculateTrendData(
  sessions: PaperSession[]
): Array<{ date: number; percentage: number }> {
  const scoredSessions = sessions
    .filter(s => s.score && s.startedAt)
    .map(s => ({
      date: s.startedAt!,
      percentage: s.score ? (s.score.correct / s.score.total) * 100 : 0,
    }))
    .sort((a, b) => a.date - b.date);

  return scoredSessions;
}

/**
 * Calculate trend data with paper type and section information
 * Returns array with paper type and section for filtering
 */
export function calculateTrendDataWithMetadata(
  sessions: PaperSession[]
): Array<{ date: number; percentage: number; paperType?: PaperType; section?: PaperSection }> {
  const scoredSessions = sessions
    .filter(s => s.score && s.startedAt)
    .map(s => {
      const result: {
        date: number;
        percentage: number;
        paperType?: PaperType;
        section?: PaperSection;
      } = {
        date: s.startedAt!,
        percentage: s.score ? (s.score.correct / s.score.total) * 100 : 0,
        paperType: s.paperName,
      };
      
      // Use first section if available
      if (s.selectedSections && s.selectedSections.length > 0) {
        result.section = s.selectedSections[0];
      }
      
      return result;
    })
    .sort((a, b) => a.date - b.date);

  return scoredSessions;
}

/**
 * Get all mistake tags from sessions
 */
export function getAllMistakeTags(sessions: PaperSession[]): MistakeTag[] {
  const allTags: MistakeTag[] = [];
  sessions.forEach(session => {
    session.mistakeTags.forEach(tag => {
      if (tag && tag !== 'None' && !allTags.includes(tag)) {
        allTags.push(tag);
      }
    });
  });
  return allTags;
}


