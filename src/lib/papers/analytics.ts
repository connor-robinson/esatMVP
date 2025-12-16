/**
 * Analytics calculations for paper sessions
 */

import type { PaperSession, PaperType, MistakeTag } from '@/types/papers';

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


