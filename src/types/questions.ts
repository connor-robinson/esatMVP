/**
 * Updated question types to match your new schema
 */

export interface Question {
  id: number;
  questionNumber: number;
  paperType: 'ESAT' | 'TMUA' | 'STEP' | 'MAT' | 'PAT' | 'ENGAA' | 'NSAA' | 'TMUA' | 'TSA';
  sectionName: 'Maths' | 'Physics' | 'Advanced Maths' | 'Chemistry' | 'Biology' | 'General';
  questionImage: string; // Public URL to question PNG
  answerLetter: string; // Single letter: 'A', 'B', 'C', 'D', etc.
  
  // Solution can be either image OR text
  solutionImage?: string; // Public URL to solution image (if preset)
  solutionText?: string; // AI-generated solution text (if AI)
  solutionType: 'preset_image' | 'ai_generated' | 'none';
  
  insertedAt: string;
  updatedAt: string;
}

export interface CreateQuestionData {
  questionNumber: number;
  paperType: string;
  sectionName: string;
  questionImage: string;
  answerLetter: string;
  solutionImage?: string;
  solutionText?: string;
  solutionType: 'preset_image' | 'ai_generated' | 'none';
}

export interface QuestionUploadSession {
  id: string;
  paperType: string;
  sectionName: string;
  totalQuestions: number;
  processedQuestions: number;
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}





