/**
 * Analytics and performance tracking types
 */

export interface SessionData {
  id: string;
  userId: string;
  topicId: string;
  level: number;
  startTime: Date;
  endTime: Date;
  questions: QuestionAttempt[];
}

export interface QuestionAttempt {
  questionId: string;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  correct: boolean;
  timeSpent: number; // milliseconds
  timestamp: Date;
}

export interface UserStats {
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number; // milliseconds
  sessionCount: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: Date | null;
  topicStats: Record<string, TopicStats>;
  createdAt: Date;
}

export interface TopicStats {
  topicId: string;
  topicName: string;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number; // percentage
  avgSpeed: number; // ms per question
  bestSpeed: number; // ms per question
  totalTime: number;
  sessionCount: number;
  rank: number | null;
  lastPracticed: Date | null;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  score: number; // normalized 0-1000
  questionsAnswered: number;
  accuracy: number; // percentage
  avgSpeed: number; // ms per question
  rank: number;
  badge?: string; // "🥇", "🥈", "🥉"
}

export interface PerformanceDataPoint {
  date: string; // ISO date string for charting
  accuracy: number;
  avgSpeed: number;
  questionsAnswered: number;
}

export interface PersonalGoal {
  id: string;
  userId: string;
  type: 'accuracy' | 'speed' | 'streak' | 'volume';
  target: number;
  current: number;
  topicId?: string;
  deadline?: Date;
  progress: number; // 0-100
  completed: boolean;
  createdAt: Date;
}

export interface Insight {
  id: string;
  type: 'strength' | 'weakness' | 'improvement' | 'suggestion' | 'achievement';
  message: string;
  icon: string;
  topicId?: string;
  timestamp: Date;
}

export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface TrendData {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
}

export interface SessionSummary {
  id: string;
  timestamp: Date;
  topicIds: string[]; // Multiple topics can be in one session
  topicNames: string[];
  score: number; // 0-1000
  accuracy: number; // percentage
  avgSpeed: number; // ms per question
  totalQuestions: number;
  correctAnswers: number;
  totalTime: number; // milliseconds
  isLatest?: boolean; // Mark the most recent session
}

export interface SessionDetail extends SessionSummary {
  // Mini chart data for expanded view
  progressData: SessionProgressPoint[];
  // Commonly wrong questions (for recent sessions)
  commonMistakes?: WrongQuestionPattern[];
}

export interface SessionProgressPoint {
  questionNumber: number; // 1, 2, 3...
  accuracy: number; // Running accuracy at this point
  speed: number; // Time taken for this question (seconds)
}

export interface WrongQuestionPattern {
  question: string; // e.g., "47 × 8"
  userAnswer: number;
  correctAnswer: number;
  count: number; // How many times wrong
}

export interface TopicDetailStats extends TopicStats {
  // Additional fields for topics detail view
  commonMistakes?: WrongQuestionPattern[];
  practiceFrequency: number; // Sessions per week
  totalPracticeTime: number; // Total milliseconds
  recentSessions: number; // Sessions in last 7 days
  globalRank?: number; // Global rank across all users for this topic
  totalUsers?: number; // Total number of users with this topic
  percentile?: number; // Percentile rank (0-100) based on composite score
  compositeScore?: number; // Composite performance score (0-1000)
}




