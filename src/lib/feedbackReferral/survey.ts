export type FeedbackQuestionType = "single" | "multi" | "scale" | "longtext";

export interface FeedbackQuestion {
  id: string;
  type: FeedbackQuestionType;
  label: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
}

export interface FeedbackSurveyDefinition {
  title: string;
  intro: string;
  estimatedTime: string;
  questions: FeedbackQuestion[];
}

export type FeedbackAnswerValue = string | number | string[];

export interface FeedbackAnswer {
  questionId: string;
  value: FeedbackAnswerValue;
}

export const FEEDBACK_REFERRAL_SURVEY: FeedbackSurveyDefinition = {
  title: "2-minute feedback",
  intro:
    "Tell us what to fix and what is working. If the written answers are specific enough, you get a one-friend code for 50% off.",
  estimatedTime: "About 2 minutes",
  questions: [
    {
      id: "time_using",
      type: "single",
      label: "How long have you been using the app?",
      options: [
        { value: "today", label: "I just started" },
        { value: "few_days", label: "A few days" },
        { value: "week_plus", label: "A week or more" },
        { value: "not_much", label: "I have barely used it" },
      ],
    },
    {
      id: "parts_used",
      type: "multi",
      label: "Which parts have you actually used?",
      options: [
        { value: "calibration", label: "Calibration" },
        { value: "question_bank", label: "Question bank" },
        { value: "past_papers", label: "Past papers" },
        { value: "mental_maths", label: "Mental maths / drills" },
        { value: "score_converter", label: "Score converter" },
        { value: "other", label: "Something else" },
      ],
    },
    {
      id: "recommend",
      type: "scale",
      label: "How likely are you to recommend this to a friend preparing for ESAT?",
      scaleMin: 0,
      scaleMax: 10,
      scaleMinLabel: "Not likely",
      scaleMaxLabel: "Very likely",
    },
    {
      id: "works_well",
      type: "longtext",
      label: "What is working well? Be specific.",
      help: "Name a screen, question type, or moment. One word answers do not count.",
      required: true,
      minLength: 40,
      maxLength: 1200,
    },
    {
      id: "improve_first",
      type: "longtext",
      label: "What is the one thing we should improve first, and why?",
      help: "Describe the problem and what you wanted instead.",
      required: true,
      minLength: 80,
      maxLength: 1500,
    },
    {
      id: "broken_or_confusing",
      type: "longtext",
      label: "What felt broken, slow, or confusing?",
      help: "If nothing broke, say what almost made you quit.",
      required: true,
      minLength: 40,
      maxLength: 1200,
    },
    {
      id: "anything_else",
      type: "longtext",
      label: "Anything else we should know?",
      required: false,
      minLength: 0,
      maxLength: 1200,
    },
  ],
};

function asMap(answers: FeedbackAnswer[]): Record<string, FeedbackAnswerValue> {
  const map: Record<string, FeedbackAnswerValue> = {};
  for (const a of answers) map[a.questionId] = a.value;
  return map;
}

function trimmedText(value: FeedbackAnswerValue | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateFeedbackReferralSurvey(
  answers: FeedbackAnswer[],
): string | null {
  const map = asMap(answers);
  const written: string[] = [];

  for (const q of FEEDBACK_REFERRAL_SURVEY.questions) {
    const val = map[q.id];
    const isEmpty =
      val === undefined ||
      val === "" ||
      (Array.isArray(val) && val.length === 0);

    if (q.required !== false && isEmpty) {
      return `Please answer: "${q.label}"`;
    }
    if (isEmpty) continue;

    if (q.type === "single" && q.options) {
      if (!q.options.some((o) => o.value === String(val))) {
        return `Invalid answer for "${q.label}"`;
      }
    }
    if (q.type === "multi" && q.options && Array.isArray(val)) {
      const valid = new Set(q.options.map((o) => o.value));
      if (val.length === 0 || !val.every((v) => valid.has(v))) {
        return `Invalid selection for "${q.label}"`;
      }
    }
    if (q.type === "scale") {
      const n = typeof val === "number" ? val : Number(val);
      const min = q.scaleMin ?? 0;
      const max = q.scaleMax ?? 10;
      if (!Number.isInteger(n) || n < min || n > max) {
        return `Invalid value for "${q.label}"`;
      }
    }
    if (q.type === "longtext") {
      const text = trimmedText(val);
      const min = q.minLength ?? 0;
      const max = q.maxLength ?? 1500;
      if (q.required !== false && text.length < min) {
        return `"${q.label}" needs at least ${min} characters. Add a concrete example.`;
      }
      if (text.length > max) {
        return `"${q.label}" is too long.`;
      }
      if (text) written.push(text.toLowerCase());
    }
  }

  const unique = new Set(written);
  if (written.length >= 2 && unique.size === 1) {
    return "Please write different answers for each box. Copy-pasting the same text does not count.";
  }

  return null;
}
