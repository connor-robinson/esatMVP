export type FeedbackQuestionType = "single" | "multi" | "scale" | "longtext";

export interface FeedbackFollowUpText {
  id: string;
  label: string;
  help?: string;
  minLength?: number;
  maxLength?: number;
}

export interface FeedbackRequiredOptionDetail {
  optionValue: string;
  id: string;
  label: string;
  help?: string;
  minLength?: number;
  maxLength?: number;
}

export interface FeedbackQuestion {
  id: string;
  type: FeedbackQuestionType;
  label: string;
  help?: string;
  /** Optional section eyebrow shown above the question (e.g. Pricing / value). */
  section?: string;
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
  /** Optional "explain why" box under the main answer. */
  whyOptional?: boolean;
  /** Shown after the main answer is set (e.g. describe-to-a-friend after recommend). */
  followUpText?: FeedbackFollowUpText;
  /** Extra required text when specific option(s) are selected. */
  requiredDetails?: FeedbackRequiredOptionDetail[];
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

export function feedbackWhyId(questionId: string): string {
  return `${questionId}_why`;
}

export const FEEDBACK_REFERRAL_SURVEY: FeedbackSurveyDefinition = {
  title: "Quick feedback",
  intro: "Answer a few questions to unlock a discount code for your friend.",
  estimatedTime: "About 2 minutes",
  questions: [
    {
      id: "most_useful",
      type: "single",
      label: "What's most useful?",
      whyOptional: true,
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
      whyOptional: true,
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
      scaleMin: 0,
      scaleMax: 10,
      scaleMinLabel: "Not really",
      scaleMaxLabel: "Yes, for sure",
      whyOptional: true,
      followUpText: {
        id: "describe_friend",
        label: "In one sentence, how would you describe ESATCamp to a friend?",
        minLength: 12,
        maxLength: 280,
      },
    },
    {
      id: "recommend_more",
      type: "single",
      label: "What would make you more likely to recommend us?",
      whyOptional: true,
      options: [
        {
          value: "better_questions",
          label: "Better questions",
        },
        {
          value: "cheaper",
          label: "Cheaper",
        },
        {
          value: "more_papers",
          label: "More papers",
        },
        {
          value: "clearer_progress",
          label: "Clearer progress",
        },
        {
          value: "mobile",
          label: "Easier to use on my phone",
        },
      ],
    },
    {
      id: "price_fair",
      type: "single",
      section: "Pricing / value",
      label: "Was the price fair for what you got?",
      whyOptional: true,
      options: [
        {
          value: "too_high",
          label: "Too high",
          description: "Felt expensive for what you used",
        },
        {
          value: "fair",
          label: "Fair",
          description: "About right for the value",
        },
        {
          value: "great_value",
          label: "Great value",
          description: "Worth more than you paid",
        },
        {
          value: "not_paying_yet",
          label: "Not paying yet",
          description: "Still on free / trial, or undecided",
        },
      ],
    },
    {
      id: "almost_stopped",
      type: "multi",
      section: "Pricing / value",
      label: "What almost stopped you from paying or continuing?",
      whyOptional: true,
      options: [
        {
          value: "price",
          label: "Price",
          description: "Cost was the main hesitation",
        },
        {
          value: "unsure_value",
          label: "Unsure it would help",
          description: "Not clear enough that it was worth it",
        },
        {
          value: "other_resources",
          label: "Other resources",
          description: "Already using something else",
        },
        {
          value: "technical",
          label: "Technical issues",
          description: "Bugs, confusing UI, or device problems",
        },
        {
          value: "time",
          label: "Time",
          description: "Hard to fit practice into the week",
        },
        {
          value: "nothing",
          label: "Nothing really",
          description: "You were ready to continue",
        },
        {
          value: "other",
          label: "Something else",
          description: "A different reason",
        },
      ],
      requiredDetails: [
        {
          optionValue: "technical",
          id: "almost_stopped_technical",
          label: "What technical issue did you hit?",
          minLength: 8,
          maxLength: 500,
        },
      ],
    },
    {
      id: "camp_missing",
      type: "multi",
      section: "What ESATCamp is missing",
      label: "What is ESATCamp missing / what would you like to see?",
      whyOptional: true,
      options: [
        {
          value: "more_papers",
          label: "More papers",
          description: "More full timed papers or mocks",
        },
        {
          value: "better_explanations",
          label: "Better explanations",
          description: "Clearer solutions and walkthroughs",
        },
        {
          value: "more_topics",
          label: "More topic coverage",
          description: "Broader or deeper practice by topic",
        },
        {
          value: "progress",
          label: "Clearer progress",
          description: "Easier to see improvement over time",
        },
        {
          value: "mobile",
          label: "Better mobile",
          description: "Works better on phone",
        },
        {
          value: "pricing",
          label: "Pricing options",
          description: "Different plans, trials, or free content",
        },
        {
          value: "other",
          label: "Other",
          description: "Tell us what else you'd like",
        },
      ],
      requiredDetails: [
        {
          optionValue: "other",
          id: "camp_missing_other",
          label: "What else would you like to see?",
          help: "Required when you select Other.",
          minLength: 8,
          maxLength: 500,
        },
      ],
    },
    {
      id: "improve_first",
      type: "longtext",
      label: "What's one thing we should improve?",
      help: "Tap an example to start, then add your own detail. An example alone is not enough.",
      required: true,
      minLength: 28,
      maxLength: 1000,
      examples: [
        "Some Math 1 questions feel too easy compared with the real exam",
        "I found a Math 1 question that looked incorrect or had a wrong answer",
        "It's unclear how to leave the question bank once I'm in a set",
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
    {
      id: "anything_else",
      type: "longtext",
      label: "Anything else we should know?",
      help: "Optional. Bugs, ideas, or context we missed.",
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

function selectedIncludes(
  value: FeedbackAnswerValue | undefined,
  optionValue: string,
): boolean {
  if (Array.isArray(value)) return value.includes(optionValue);
  return value === optionValue;
}

/** Extra characters required beyond a tapped example starter. */
export const EXAMPLE_EXTRA_MIN_CHARS = 12;

export function normalizeExampleText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function matchesExampleExactly(
  text: string,
  examples: string[] | undefined,
): boolean {
  if (!examples?.length) return false;
  const normalized = normalizeExampleText(text);
  return examples.some(
    (example) => normalizeExampleText(example) === normalized,
  );
}

/**
 * True when the answer is more than a canned example.
 * Tapping an example alone is never enough.
 */
export function hasWrittenBeyondExamples(
  text: string,
  examples: string[] | undefined,
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!examples?.length) return true;
  if (matchesExampleExactly(trimmed, examples)) return false;

  for (const example of examples) {
    const exampleTrim = example.trim();
    if (!exampleTrim) continue;
    if (!trimmed.toLowerCase().startsWith(exampleTrim.toLowerCase())) continue;
    const rest = trimmed.slice(exampleTrim.length).trim();
    return rest.length >= EXAMPLE_EXTRA_MIN_CHARS;
  }

  return true;
}

function formatChoiceValue(
  question: FeedbackQuestion,
  val: FeedbackAnswerValue,
): string {
  if (Array.isArray(val)) {
    const labels = val.map((v) => {
      const opt = question.options?.find((o) => o.value === v);
      return opt?.label ?? v;
    });
    return labels.join(", ") || "(none)";
  }
  if (question.type === "scale") return String(val);
  if (question.options) {
    const opt = question.options.find((o) => o.value === String(val));
    return opt?.label ?? String(val);
  }
  return String(val).trim() || "(skipped)";
}

export function formatFeedbackAnswersForEmail(
  answers: FeedbackAnswer[],
): string {
  const map = asMap(answers);
  const lines: string[] = [];
  for (const q of FEEDBACK_REFERRAL_SURVEY.questions) {
    const val = map[q.id];
    let display = "(skipped)";
    if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
      display = "(skipped)";
    } else {
      display = formatChoiceValue(q, val);
    }
    lines.push(`${q.label}`);
    lines.push(display);
    lines.push("");

    if (q.followUpText) {
      const follow = trimmedText(map[q.followUpText.id]);
      lines.push(q.followUpText.label);
      lines.push(follow || "(skipped)");
      lines.push("");
    }

    for (const detail of q.requiredDetails ?? []) {
      if (!selectedIncludes(val, detail.optionValue)) continue;
      const text = trimmedText(map[detail.id]);
      lines.push(detail.label);
      lines.push(text || "(missing)");
      lines.push("");
    }

    if (q.whyOptional) {
      const why = trimmedText(map[feedbackWhyId(q.id)]);
      if (why) {
        lines.push(`Why (${q.label})`);
        lines.push(why);
        lines.push("");
      }
    }
  }
  return lines.join("\n").trim();
}

function isMainAnswerComplete(
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
    if (text.length < (question.minLength ?? 0)) return false;
    return hasWrittenBeyondExamples(text, question.examples);
  }
  return false;
}

function isDetailComplete(
  detail: FeedbackRequiredOptionDetail,
  text: string,
): boolean {
  const min = detail.minLength ?? 1;
  return text.trim().length >= min;
}

function isFollowUpComplete(
  followUp: FeedbackFollowUpText,
  text: string,
): boolean {
  const min = followUp.minLength ?? 1;
  return text.trim().length >= min;
}

/**
 * Whether the current step can continue, including follow-ups and
 * required option details. `answers` should include companion fields.
 */
export function isFeedbackStepComplete(
  question: FeedbackQuestion,
  value: FeedbackAnswerValue | undefined,
  answers: Record<string, FeedbackAnswerValue> = {},
): boolean {
  if (!isMainAnswerComplete(question, value)) return false;

  if (question.followUpText) {
    const followText = trimmedText(answers[question.followUpText.id]);
    if (!isFollowUpComplete(question.followUpText, followText)) return false;
  }

  for (const detail of question.requiredDetails ?? []) {
    if (!selectedIncludes(value, detail.optionValue)) continue;
    const text = trimmedText(answers[detail.id]);
    if (!isDetailComplete(detail, text)) return false;
  }

  return true;
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
      if (
        q.required !== false &&
        text &&
        !hasWrittenBeyondExamples(text, q.examples)
      ) {
        return `Please add your own detail after the example for "${q.label}".`;
      }
      if (text) written.push(text.toLowerCase());
    }

    if (q.followUpText) {
      const follow = trimmedText(map[q.followUpText.id]);
      const min = q.followUpText.minLength ?? 1;
      const max = q.followUpText.maxLength ?? 500;
      if (follow.length < min) {
        return `Please answer: "${q.followUpText.label}"`;
      }
      if (follow.length > max) {
        return `"${q.followUpText.label}" is too long.`;
      }
      written.push(follow.toLowerCase());
    }

    for (const detail of q.requiredDetails ?? []) {
      if (!selectedIncludes(val, detail.optionValue)) continue;
      const text = trimmedText(map[detail.id]);
      const min = detail.minLength ?? 1;
      const max = detail.maxLength ?? 500;
      if (text.length < min) {
        return `Please specify: "${detail.label}"`;
      }
      if (text.length > max) {
        return `"${detail.label}" is too long.`;
      }
      written.push(text.toLowerCase());
    }

    if (q.whyOptional) {
      const why = trimmedText(map[feedbackWhyId(q.id)]);
      if (why.length > 500) {
        return `The "explain why" note for "${q.label}" is too long.`;
      }
      if (why) written.push(why.toLowerCase());
    }
  }

  const unique = new Set(written);
  if (written.length >= 2 && unique.size === 1) {
    return "Please write different answers for each box. Copy-pasting the same text does not count.";
  }

  return null;
}
