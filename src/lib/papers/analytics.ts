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
  const sectionPercentiles = row.section_percentiles as Record<string, { percentile: number | null; score: number | null; table: string | null; label: string }> | null;

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
    predictedScore: row.predicted_score ?? undefined,
    sectionPercentiles: sectionPercentiles || undefined,
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
    const response = await fetch('/api/past-papers/sessions', {
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
 * Fetch in-progress sessions (sessions with ended_at IS NULL) from the API
 */
export async function fetchInProgressSessions(): Promise<PaperSession[]> {
  try {
    const response = await fetch('/api/past-papers/sessions?in_progress=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch in-progress sessions: ${response.statusText}`);
    }

    const data = await response.json();
    const sessions = (data.sessions || []) as PaperSessionRow[];
    
    return sessions.map(convertSessionRow);
  } catch (error) {
    console.error('[analytics] Failed to fetch in-progress sessions', error);
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

/**
 * Extract year from paper variant string
 */
export function extractYearFromVariant(variant: string): number | null {
  const yearMatch = variant.match(/\d{4}/);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

/**
 * Calculate percentile based on distribution of scores within the same paper
 * Percentile represents where this session's score ranks among all sessions for that paper
 */
export function calculatePercentileFromPaperDistribution(
  score: number,
  allScoresForPaper: number[]
): number {
  if (allScoresForPaper.length === 0) return 0;
  if (allScoresForPaper.length === 1) return 50; // If only one score, return median
  
  const sortedScores = [...allScoresForPaper].sort((a, b) => a - b);
  const rank = sortedScores.filter(s => s <= score).length;
  const percentile = (rank / sortedScores.length) * 100;
  
  return Math.max(0, Math.min(100, percentile));
}

/**
 * IMPORTANT: This function calculates "relative percentiles" based on the user's own session distribution,
 * NOT official exam percentiles like the mark page does.
 * 
 * The mark page calculates percentiles using:
 * - Official percentile tables (from /api/esat)
 * - Section-specific scores (not just overall percentage)
 * - Score conversion for some papers
 * - Different tables for TMUA pre-2023 vs post-2024
 * 
 * For accurate official percentiles, we would need:
 * - Question data for each session (to calculate section scores)
 * - Conversion tables (for papers with score conversion)
 * - Access to official percentile tables
 * 
 * TODO: Consider storing official percentiles when sessions are completed, or
 * implementing proper percentile calculation that matches the mark page logic.
 */
export function calculateTrendDataWithPercentiles(
  sessions: PaperSession[]
): Array<{ date: number; percentile: number; paperType?: PaperType; section?: PaperSection; rawScore?: number }> {
  // Group sessions by paper type to calculate percentiles within each paper
  const scoresByPaper = new Map<PaperType, number[]>();
  
  // Collect all scores by paper type
  sessions.filter(s => s.score && s.startedAt).forEach(session => {
    const paperType = session.paperName;
    const scorePercentage = session.score ? (session.score.correct / session.score.total) * 100 : 0;
    
    if (!scoresByPaper.has(paperType)) {
      scoresByPaper.set(paperType, []);
    }
    scoresByPaper.get(paperType)!.push(scorePercentage);
  });
  
  // Calculate percentile for each session
  // NOTE: This is a "relative percentile" (vs your own sessions), not an official exam percentile
  const results: Array<{ date: number; percentile: number; paperType?: PaperType; section?: PaperSection; rawScore?: number }> = [];
  
  sessions.filter(s => s.score && s.startedAt).forEach(session => {
    const paperType = session.paperName;
    const scorePercentage = session.score ? (session.score.correct / session.score.total) * 100 : 0;
    const firstSection = session.selectedSections?.[0];
    
    // Get all scores for this paper type and calculate percentile
    const allScoresForPaper = scoresByPaper.get(paperType) || [];
    const percentile = calculatePercentileFromPaperDistribution(scorePercentage, allScoresForPaper);
    
    results.push({
      date: session.startedAt!,
      percentile,
      paperType,
      section: firstSection,
      rawScore: scorePercentage,
    });
  });
  
  return results.sort((a, b) => a.date - b.date);
}

export interface SectionPerformance {
  section: PaperSection;
  accuracy: number;
  avgTimePerQuestion: number;
  guessedRate: number;
  totalQuestions: number;
  correctQuestions: number;
  trend: 'improving' | 'declining' | 'stable';
  trendValue: number; // Percentage point change
}

export interface SectionPerformanceWithHistory {
  section: PaperSection;
  currentAccuracy: number;
  avgTimePerQuestion: number;
  guessedRate: number;
  totalQuestions: number;
  correctQuestions: number;
  trend: 'improving' | 'declining' | 'stable';
  trendValue: number;
  history: Array<{ date: number; accuracy: number; sessionId: string }>;
}

export interface TimeManagementInsight {
  section: PaperSection;
  avgTimePerQuestion: number;
  totalTimeSpent: number;
  timePercentage: number; // % of total session time
  accuracy: number;
  efficiencyScore: number; // correct questions per minute
  recommendation: string; // "Too slow", "Too fast", "Optimal"
}

/**
 * Calculate section performance with trends across all sessions
 * Note: For multi-section sessions, we attribute performance to all included sections
 */
export function calculateSectionPerformance(
  sessions: PaperSession[]
): SectionPerformanceWithHistory[] {
  const sectionData = new Map<PaperSection, {
    accuracies: number[];
    times: number[];
    guessed: number[];
    totals: number[];
    corrects: number[];
    history: Array<{ date: number; accuracy: number; sessionId: string }>;
  }>();

  // Collect data per section
  sessions.filter(s => s.score && s.selectedSections && s.selectedSections.length > 0).forEach(session => {
    const scorePercentage = session.score ? (session.score.correct / session.score.total) * 100 : 0;
    const totalQuestions = session.score?.total || session.perQuestionSec.length;
    const correctQuestions = session.score?.correct || 0;
    const avgTime = session.perQuestionSec.length > 0
      ? session.perQuestionSec.reduce((a, b) => a + b, 0) / session.perQuestionSec.length
      : 0;
    const guessedCount = session.guessedFlags?.filter(g => g).length || 0;
    const guessedRate = totalQuestions > 0 ? (guessedCount / totalQuestions) * 100 : 0;

    // For each section in this session, add the session data
    session.selectedSections?.forEach(section => {
      if (!sectionData.has(section)) {
        sectionData.set(section, {
          accuracies: [],
          times: [],
          guessed: [],
          totals: [],
          corrects: [],
          history: [],
        });
      }

      const data = sectionData.get(section)!;
      data.accuracies.push(scorePercentage);
      data.times.push(avgTime);
      data.guessed.push(guessedRate);
      data.totals.push(totalQuestions);
      data.corrects.push(correctQuestions);
      if (session.startedAt) {
        data.history.push({
          date: session.startedAt,
          accuracy: scorePercentage,
          sessionId: session.id,
        });
      }
    });
  });

  // Calculate metrics and trends per section
  const results: SectionPerformanceWithHistory[] = [];

  sectionData.forEach((data, section) => {
    if (data.accuracies.length === 0) return;

    const currentAccuracy = data.accuracies[data.accuracies.length - 1];
    const avgAccuracy = data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length;
    const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
    const avgGuessedRate = data.guessed.reduce((a, b) => a + b, 0) / data.guessed.length;
    const totalQuestions = data.totals.reduce((a, b) => a + b, 0);
    const correctQuestions = data.corrects.reduce((a, b) => a + b, 0);

    // Calculate trend (comparing first half vs second half of sessions)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    let trendValue = 0;

    if (data.accuracies.length >= 2) {
      const midpoint = Math.floor(data.accuracies.length / 2);
      const firstHalf = data.accuracies.slice(0, midpoint);
      const secondHalf = data.accuracies.slice(midpoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trendValue = secondAvg - firstAvg;

      if (trendValue > 3) trend = 'improving';
      else if (trendValue < -3) trend = 'declining';
    }

    // Sort history by date
    const history = [...data.history].sort((a, b) => a.date - b.date);

    results.push({
      section,
      currentAccuracy: avgAccuracy,
      avgTimePerQuestion: avgTime,
      guessedRate: avgGuessedRate,
      totalQuestions,
      correctQuestions,
      trend,
      trendValue,
      history,
    });
  });

  // Sort by section name for consistent display
  return results.sort((a, b) => a.section.localeCompare(b.section));
}

/**
 * Calculate time management insights per section
 */
export function calculateTimeManagementInsights(
  sessions: PaperSession[]
): TimeManagementInsight[] {
  const sectionData = new Map<PaperSection, {
    times: number[];
    totalTimes: number[];
    accuracies: number[];
    corrects: number[];
  }>();

  // Collect time data per section
  sessions.filter(s => s.score && s.selectedSections && s.selectedSections.length > 0).forEach(session => {
    const totalSessionTime = session.perQuestionSec.reduce((a, b) => a + b, 0);
    const avgTimePerQ = session.perQuestionSec.length > 0
      ? totalSessionTime / session.perQuestionSec.length
      : 0;
    const accuracy = session.score ? (session.score.correct / session.score.total) * 100 : 0;
    const correctQuestions = session.score?.correct || 0;

    session.selectedSections?.forEach(section => {
      if (!sectionData.has(section)) {
        sectionData.set(section, {
          times: [],
          totalTimes: [],
          accuracies: [],
          corrects: [],
        });
      }

      const data = sectionData.get(section)!;
      data.times.push(avgTimePerQ);
      data.totalTimes.push(totalSessionTime);
      data.accuracies.push(accuracy);
      data.corrects.push(correctQuestions);
    });
  });

  // Calculate average total time across all sessions for percentage calculation
  const allTotalTimes = sessions
    .filter(s => s.perQuestionSec.length > 0)
    .map(s => s.perQuestionSec.reduce((a, b) => a + b, 0));
  const avgTotalSessionTime = allTotalTimes.length > 0
    ? allTotalTimes.reduce((a, b) => a + b, 0) / allTotalTimes.length
    : 1;

  const results: TimeManagementInsight[] = [];

  sectionData.forEach((data, section) => {
    if (data.times.length === 0) return;

    const avgTimePerQ = data.times.reduce((a, b) => a + b, 0) / data.times.length;
    const avgTotalTime = data.totalTimes.reduce((a, b) => a + b, 0) / data.totalTimes.length;
    const timePercentage = avgTotalSessionTime > 0 ? (avgTotalTime / avgTotalSessionTime) * 100 : 0;
    const avgAccuracy = data.accuracies.reduce((a, b) => a + b, 0) / data.accuracies.length;
    const avgCorrects = data.corrects.reduce((a, b) => a + b, 0) / data.corrects.length;

    // Efficiency: correct questions per minute
    const efficiencyScore = avgTotalTime > 0 ? (avgCorrects / (avgTotalTime / 60)) : 0;

    // Recommendation based on time and accuracy
    let recommendation = "Optimal";
    if (avgTimePerQ > 180 && avgAccuracy < 70) { // >3 min per question, <70% accuracy
      recommendation = "Too slow - accuracy suffering";
    } else if (avgTimePerQ < 60 && avgAccuracy < 60) { // <1 min, <60% accuracy
      recommendation = "Too fast - slow down for accuracy";
    } else if (avgTimePerQ > 180) {
      recommendation = "Consider pacing faster";
    } else if (avgTimePerQ < 60 && avgAccuracy > 80) {
      recommendation = "Efficient pacing";
    }

    results.push({
      section,
      avgTimePerQuestion: avgTimePerQ,
      totalTimeSpent: avgTotalTime,
      timePercentage,
      accuracy: avgAccuracy,
      efficiencyScore,
      recommendation,
    });
  });

  return results.sort((a, b) => a.section.localeCompare(b.section));
}

