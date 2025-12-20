/**
 * Core type definitions for the application
 */

export type SubjectId = "maths" | "physics" | "chemistry" | "biology";

export type TopicCategory = 
  | "arithmetic"
  | "algebra"
  | "geometry"
  | "number_theory"
  | "shortcuts"
  | "patterns"
  | "transform"
  | "test"
  | "estimation"
  | "identities"
  | "trigonometry"
  | "mechanics"
  | "optics"
  | "electricity"
  | "thermodynamics"
  | "atomic_structure"
  | "reactions"
  | "organic"
  | "analytical"
  | "cell_biology"
  | "genetics"
  | "evolution"
  | "ecology";

export interface Subject {
  id: SubjectId;
  name: string;
  description: string;
  icon: string;
  color: string; // theme color for subject
  categories: TopicCategory[];
}

export interface TopicVariant {
  id: string;
  name: string;
  description?: string;
  difficulty: number; // For sorting/suggesting progression
  config?: Record<string, any>; // Variant-specific configuration for generators
}

export interface Topic {
  id: string;
  name: string;
  subjectId: SubjectId;
  category: TopicCategory;
  description: string;
  variants?: TopicVariant[]; // Optional - will be created from levels if not provided
  icon?: string;
  // Legacy support - will be computed from variants if variants exist
  levels?: number;
}

// Extended slide block types for rich tutorials
export type SlideBlock = 
  | { type: "text"; content: string }
  | { type: "markdown"; content: string }
  | { type: "example"; content?: string; examples: ExampleItem[] }
  | { type: "tip"; content: string }
  | { type: "visualization"; visualizationId: string; visualizationProps?: Record<string, any> }
  | { type: "mcq"; question: string; options: string[]; answer: number; explanation?: string }
  | { type: "numeric"; question: string; answer: number; unit?: string; explanation?: string }
  | { type: "formula"; content: string; latex?: string }
  | { type: "image"; src: string; alt?: string; caption?: string; x?: number; y?: number; scale?: number };

// Slide element support: draggable elements within slides
export type SlideElement =
  | { kind: "label"; text: string; x: number; y: number; scale?: number }
  | { kind: "equation"; latex: string; x: number; y: number; scale?: number }
  | { kind: "visualization"; visualizationId: string; visualizationProps?: Record<string, any>; x: number; y: number; scale?: number }
  | { kind: "image"; src: string; alt?: string; x: number; y: number; scale?: number }
  | { kind: "text"; content: string; x: number; y: number; scale?: number }
  | { kind: "markdown"; content: string; x: number; y: number; scale?: number }
  | { kind: "example"; content: string; examples: ExampleItem[]; x: number; y: number; scale?: number }
  | { kind: "tip"; content: string; x: number; y: number; scale?: number }
  | { kind: "mcq"; question: string; options: string[]; answer: number; explanation?: string; x: number; y: number; scale?: number }
  | { kind: "numeric"; question: string; answer: number; unit?: string; explanation?: string; x: number; y: number; scale?: number }
  | { kind: "formula"; content: string; latex?: string; x: number; y: number; scale?: number };

// Enhanced slide block with elements array
export type SlideBlockV2 =
  | SlideBlock
  | { type: "slide"; elements: SlideElement[] };

export interface ExampleItem {
  question: string;
  answer: string;
  explanation: string;
}

// Legacy TutorialStep for backward compatibility
export interface TutorialStep {
  type: "text" | "example" | "tip" | "visualization";
  content: string;
  examples?: {
    question: string;
    answer: string;
    explanation: string;
  }[];
  visualization?: import("./visualizations").Visualization;
  /** Optional registry id for simpler authoring of visualizations */
  visualizationId?: string;
}

export interface Lesson {
  id: string;
  level: number;
  lessonNumber: number;
  title: string;
  hasTutorial: boolean;
  tutorial?: TutorialStep[] | SlideBlock[]; // Support both legacy and new format
  drillConfig: {
    questionCount: number;
    timeLimit: number;
    /** Optional weights per question type for generators */
    generatorWeights?: Record<string, number>;
    /** Answer format for drills in this lesson */
    answerFormat?: "numeric";
    /** Unit policy for numeric answers */
    unitPolicy?: {
      required: boolean;
      allowed: string[];
      display?: string;
    };
    /** Explicit question types to include for this lesson */
    questionTypes?: string[];
  };
}

export interface DrillSession {
  id: string;
  topicId: string;
  level: number;
  questions: DrillQuestion[];
  startedAt: number;
  completedAt?: number;
  attempts: DrillAttempt[];
}

export interface DrillQuestion {
  id: string;
  question: string;
  answer: string;
  explanation?: string;
  timeLimit?: number;
}

export interface DrillAttempt {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface DrillResult {
  sessionId: string;
  topicId: string;
  level: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageTimeMs: number;
  completedAt: number;
}

// Additional types for builder and analytics
export interface TopicVariantSelection {
  topicId: string;
  variantId: string;
}

export interface SessionPreset {
  id: string;
  name: string;
  topics: string[];
  topicIds: string[];
  questionCount: number;
  durationMin: number;
  topicVariantSelections: TopicVariantSelection[]; // Array of topic-variant pairs
  topicLevels?: Record<string, number>; // Legacy support for old presets
  createdAt: number;
}

export interface BuilderSession {
  id: string;
  questions: GeneratedQuestion[];
  startedAt: number;
  endedAt?: number;
  attempts: number;
  results?: DrillResult[];
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  answer: string | number;
  topicId: string;
  difficulty: number;
  timeLimit?: number;
  /** Custom answer checker function */
  checker?: (userAnswer: string) => boolean;
  /** Explanation shown when answer is revealed */
  explanation?: string;
  /** List of acceptable alternative answers */
  acceptableAnswers?: string[];
  /** When generators produce numeric answers with units (physics) */
  numericAnswer?: {
    value: number; // canonical value in base unit
    unit: string;  // canonical unit for the value (e.g., "m/s")
  };
  /** Acceptable answer specification: units, tolerance, and aliases */
  accepts?: {
    units: string[]; // allowed units for user input
    tolerance: number; // relative tolerance (e.g., 0.01 for 1%)
    aliases?: Record<string, string>; // maps alias -> canonical unit
  };
}

export interface QuestionAttempt {
  questionId: string;
  answer: string | number;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface TopicProgress {
  topicId: string;
  questionsAnswered?: number;
  correctAnswers?: number;
  totalTime?: number;
  lastPracticed?: Date;
  currentLevel: number;
  questionsAttempted: number;
  questionsCorrect: number;
  averageTimeMs: number;
}