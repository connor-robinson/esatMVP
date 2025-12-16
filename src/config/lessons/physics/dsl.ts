import type { Lesson, TutorialStep } from "@/types/core";

type LessonInput = {
  topic: string;
  id: string;
  level: number;
  lessonNumber: number;
  title: string;
  tutorial?: TutorialStep[];
  drill: {
    questionCount: number;
    timeLimit: number;
    generatorWeights?: Record<string, number>;
    questionTypes?: string[];
    answerFormat?: "numeric";
    unitPolicy?: { required: boolean; allowed: string[]; display?: string };
  };
};

export function createLesson(input: LessonInput): Lesson {
  return {
    id: input.id,
    level: input.level,
    lessonNumber: input.lessonNumber,
    title: input.title,
    hasTutorial: Array.isArray(input.tutorial) && input.tutorial.length > 0,
    tutorial: input.tutorial,
    drillConfig: {
      questionCount: input.drill.questionCount,
      timeLimit: input.drill.timeLimit,
      generatorWeights: input.drill.generatorWeights,
      questionTypes: input.drill.questionTypes,
      answerFormat: input.drill.answerFormat,
      unitPolicy: input.drill.unitPolicy,
    },
  };
}

export function concept(content: string): TutorialStep {
  return { type: "text", content };
}

export function tip(content: string): TutorialStep {
  return { type: "tip", content };
}

export function example(args: { q: string; a: string; exp: string } | { items: { q: string; a: string; exp: string }[]; content?: string }): TutorialStep {
  if ("items" in args) {
    return {
      type: "example",
      content: args.content || "Examples:",
      examples: args.items.map((it) => ({ question: it.q, answer: it.a, explanation: it.exp })),
    };
  }
  return {
    type: "example",
    content: "Example:",
    examples: [{ question: args.q, answer: args.a, explanation: args.exp }],
  };
}

export function staticDiagram(id: string, props?: Record<string, any>): TutorialStep {
  return { type: "visualization", content: "", visualizationId: id } as any;
}

export function interactiveDiagram(id: string, props?: Record<string, any>): TutorialStep {
  return { type: "visualization", content: "", visualizationId: id } as any;
}


