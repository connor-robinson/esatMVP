import { z } from "zod";

export const OptionIdSchema = z.enum(["A", "B", "C", "D", "E", "F", "G"]);
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);

export const ContentSegmentSchema = z.object({
  type: z.enum(["text", "math"]),
  content: z.string().min(1),
});

export const DiagramSchema = z.object({
  id: z.string(),
  svgPath: z.string().startsWith("/diagrams/svg/"),
  pngPath: z.string().startsWith("/diagrams/png/"),
  alt: z.string().min(1),
  notToScale: z.boolean(),
});

export const QuestionSchema = z.object({
  id: z.string(),
  module: z.union([z.literal(1), z.literal(2)]),
  questionNumber: z.number().int().min(1).max(27),
  difficulty: DifficultySchema,
  syllabus: z.object({
    primaryCode: z.string().regex(/^MM[1-8]\.\d+$/),
    primaryTopic: z.string(),
    secondaryTopic: z.string().nullable(),
  }),
  estimatedSeconds: z.number().int().positive().max(90),
  strongQuestion: z.boolean(),
  stemPlain: z.string(),
  stem: z.array(ContentSegmentSchema).min(1),
  options: z.array(z.object({ id: OptionIdSchema, text: z.string(), tex: z.string().nullable() })).min(4).max(7),
  correctOptionId: OptionIdSchema,
  diagram: DiagramSchema.nullable(),
  authorNotes: z.object({
    solution: z.string(),
    tip: z.string(),
    distractors: z.partialRecord(OptionIdSchema, z.string()),
    calibration: z.string(),
    calibrationSource: z.object({ label: z.string(), url: z.string().url().nullable() }),
  }),
}).superRefine((question, context) => {
  const optionIds = new Set(question.options.map((option) => option.id));
  if (!optionIds.has(question.correctOptionId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Correct answer must be an option" });
  }
  const expectedDistractors = [...optionIds].filter((id) => id !== question.correctOptionId).sort();
  const actualDistractors = Object.keys(question.authorNotes.distractors).sort();
  if (JSON.stringify(expectedDistractors) !== JSON.stringify(actualDistractors)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Distractor map does not match incorrect options" });
  }
});

export const ModuleSchema = z.object({
  id: z.string(),
  moduleNumber: z.union([z.literal(1), z.literal(2)]),
  title: z.string(),
  durationMinutes: z.literal(40),
  calculatorAllowed: z.literal(false),
  questions: z.array(QuestionSchema).length(27),
});

export const PracticePackSchema = z.object({
  metadata: z.object({
    id: z.string(), title: z.string(), subject: z.literal("Mathematics 2"),
    questionCount: z.literal(54), moduleCount: z.literal(2),
    contentFormat: z.literal("mixed-text-tex"),
    texDelimiters: z.object({ inline: z.tuple([z.string(), z.string()]), display: z.tuple([z.string(), z.string()]) }),
    notice: z.string(),
    officialSources: z.array(z.object({ label: z.string(), url: z.string().url() })),
  }),
  modules: z.array(ModuleSchema).length(2),
});

export type PracticePack = z.infer<typeof PracticePackSchema>;
export type PracticeModule = z.infer<typeof ModuleSchema>;
export type PracticeQuestion = z.infer<typeof QuestionSchema>;
