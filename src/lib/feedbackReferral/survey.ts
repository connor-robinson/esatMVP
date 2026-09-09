export type FeedbackQuestionType = "single" | "multi" | "scale" | "longtext";

export interface FeedbackQuestion {
  id: string;
  type: FeedbackQuestionType;
  label: string;
  help?: string;
  options?: Array<{ value: string; label: string; description?: string }>;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  /** Shown as clickable example prompts under the text box. */
  examples?: string[];
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
  title: "Quick feedback",
  intro: "Answer a few questions to unlock 50% off for one friend.",
  estimatedTime: "About 1 minute",
  questions: [
    {
      id: "most_useful",
      type: "single",
      label: "What's most useful?",
      help: "Pick the one thing that helped you most.",
      options: [
        {
          value: "calibration",
          label: "Calibration",
          description: "The short placement quiz",
        },
        {
          value: "question_bank",
          label: "Question bank",
          description: "Practice by topic",
        },
        {
          value: "past_papers",
          label: "Past papers",
          description: "Timed full papers",
        },
        {
          value: "mental_maths",
          label: "Mental maths",
          description: "Drills and speed practice",
        },
        {
          value: "score_converter",
          label: "Score converter",
          description: "Rough grade estimates",
        },
        {
          value: "other",
          label: "Something else",
          description: "Homepage, settings, or another bit",
        },
      ],
    },
    {
      id: "least_useful",
      type: "single",
      label: "What's least useful?",
      help: "Pick the one that felt weakest or hardest to use.",
      options: [
        {
          value: "calibration",
          label: "Calibration",
          description: "The short placement quiz",
        },
        {
          value: "question_bank",
          label: "Question bank",
          description: "Practice by topic",
        },
        {
          value: "past_papers",
          label: "Past papers",
          description: "Timed full papers",
        },
        {
          value: "mental_maths",
          label: "Mental maths",
          description: "Drills and speed practice",
        },
        {
          value: "score_converter",
          label: "Score converter",
          description: "Rough grade estimates",
        },
        {
          value: "other",
          label: "Something else",
          description: "Homepage, settings, or another bit",
        },
      ],
    },
    {
      id: "recommend",
      type: "scale",
      label: "Would you recommend us to a friend?",
      help: "0 = not really, 10 = yes, for sure.",
      scaleMin: 0,
      scaleMax: 10,
      scaleMinLabel: "Not really",
      scaleMaxLabel: "Yes, for sure",
    },
    {
      id: "improve_first",
      type: "longtext",
      label: "What's one thing we should improve?",
      help: "Tap an example to start, then edit it in your own words.",
      required: true,
      minLength: 20,
      maxLength: 1000,
      examples: [
        "It's unclear how to leave the question bank",
        "I want to review my incorrect options more easily in question bank",
        "The questions are bad",
      ],
    },
    {
      id: "works_well",
      type: "longtext",
      label: "Anything you liked?",
      help: "Optional, but we'd love to hear it.",
      required: false,
      minLength: 0,
      maxLength: 1000,
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

export function formatFeedbackAnswersForEmail(
  answers: FeedbackAnswer[],
): string {
  const map = asMap(answers);
  const lines: string[] = [];
  for (const q of FEEDBACK_REFERRAL_SURVEY.questions) {
    const val = map[q.id];
    let display = "(skipped)";
    if (val === undefined || val === "") {
      display = "(skipped)";
    } else if (Array.isArray(val)) {
      const labels = val.map((v) => {
        const opt = q.options?.find((o) => o.value === v);
        return opt?.label ?? v;
      });
      display = labels.join(", ") || "(none)";
    } else if (q.type === "scale") {
      display = String(val);
    } else {
      display = String(val).trim() || "(skipped)";
    }
    lines.push(`${q.label}`);
    lines.push(display);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function isFeedbackStepComplete(
  question: FeedbackQuestion,
  value: FeedbackAnswerValue | undefined,
): boolean {
  if (question.type === "multi") {
    return Array.isArray(value) && value.length > 0;
  }
  if (question.type === "scale") {
    if (typeof value !== "number" && typeof value !== "string") return false;
    const n = typeof value === "number" ? value : Number(value);
    const min = question.scaleMin ?? 0;
    const max = question.scaleMax ?? 10;
    return Number.isInteger(n) && n >= min && n <= max;
  }
  if (question.type === "single") {
    return typeof value === "string" && value.length > 0;
  }
  if (question.type === "longtext") {
    if (question.required === false) return true;
    const text = trimmedText(value);
    return text.length >= (question.minLength ?? 0);
  }
  return false;
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
        return `"${q.label}" needs a bit more detail (at least ${min} characters).`;
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
