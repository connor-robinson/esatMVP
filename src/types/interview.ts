export type InterviewSubject = 'math' | 'physics' | 'chemistry';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewQuestionType = 'numeric' | 'flashcard';

export type ChartSpec = {
  type: 'line' | 'area';
  title?: string;
  xKey?: string;
  yKey?: string;
  data: Array<Record<string, number>>;
};

export interface InterviewQuestion {
  id: string;
  title: string;
  subject: InterviewSubject;
  difficulty: InterviewDifficulty;
  type: InterviewQuestionType;
  prompt: string;
  modelAnswer: string;
  hints?: string[];
  topics?: string[];
  assets?: { charts?: ChartSpec[] };
}

export interface InterviewAttempt {
  id: string;
  questionId: string;
  startedAt: string;
  endedAt?: string;
  secondsSpent?: number;
  userAnswer?: string;
  selfScore?: 'correct' | 'partial' | 'incorrect';
  numericCorrect?: boolean;
  recordingUrl?: string;
}

export interface MockItemResult {
  questionId: string;
  attemptId: string;
  selfScore?: 'strong' | 'average' | 'missed';
  notes?: string;
  recordingUrl?: string;
}

export interface MockSession {
  id: string;
  subject: InterviewSubject;
  difficulty: InterviewDifficulty;
  questionIds: string[];
  createdAt: string;
  completedAt?: string;
  results?: MockItemResult[];
}


