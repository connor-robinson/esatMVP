/**
 * Founding Tester Programme - survey definitions.
 *
 * These are versioned. Changing questions should bump the `version` so historic
 * structured responses (tester_survey_responses) remain interpretable.
 *
 * Shared by the client SurveyRunner (rendering) and the server (validation),
 * so branching conditions are declarative and serialisable.
 */

import type { SurveyKey, SurveyAnswer } from "./types";

export type QuestionType =
  | "single" // choose one
  | "multi" // choose many
  | "scale" // numeric scale
  | "text" // short free text
  | "longtext"; // multi-line free text

export interface QuestionOption {
  value: string;
  label: string;
}

/** Show this question only if the answer to `q` is one of `anyOf`. */
export interface ShowCondition {
  q: string;
  anyOf: string[];
}

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  options?: QuestionOption[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required?: boolean;
  maxLength?: number;
  showIf?: ShowCondition;
}

export interface SurveyDefinition {
  key: SurveyKey;
  version: number;
  title: string;
  intro: string;
  estimatedTime: string;
  questions: SurveyQuestion[];
}

// ---------------------------------------------------------------------------
// Visibility / validation helpers (used on both client and server)
// ---------------------------------------------------------------------------

function answerMatches(
  value: string | number | string[] | undefined,
  anyOf: string[],
): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value)) return value.some((v) => anyOf.includes(v));
  return anyOf.includes(String(value));
}

export function isQuestionVisible(
  question: SurveyQuestion,
  answers: Record<string, string | number | string[] | undefined>,
): boolean {
  if (!question.showIf) return true;
  return answerMatches(answers[question.showIf.q], question.showIf.anyOf);
}

/** Returns an error string if invalid, or null if the submission is acceptable. */
export function validateSurveySubmission(
  survey: SurveyDefinition,
  answers: SurveyAnswer[],
): string | null {
  const map: Record<string, string | number | string[]> = {};
  for (const a of answers) map[a.questionId] = a.value;

  for (const q of survey.questions) {
    if (!isQuestionVisible(q, map)) continue;
    const val = map[q.id];
    const isEmpty =
      val === undefined ||
      val === "" ||
      (Array.isArray(val) && val.length === 0);
    const required = q.required !== false && q.type !== "text" && q.type !== "longtext";
    if (required && isEmpty) {
      return `Please answer: "${q.label}"`;
    }
    if (!isEmpty && (q.type === "single") && q.options) {
      if (!q.options.some((o) => o.value === String(val))) {
        return `Invalid answer for "${q.label}"`;
      }
    }
    if (!isEmpty && q.type === "multi" && q.options && Array.isArray(val)) {
      const valid = new Set(q.options.map((o) => o.value));
      if (!val.every((v) => valid.has(v))) {
        return `Invalid selection for "${q.label}"`;
      }
    }
    if (!isEmpty && q.type === "scale" && typeof val !== "number") {
      const n = Number(val);
      if (Number.isNaN(n)) return `Invalid value for "${q.label}"`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Survey: Initial (~1 minute). Completing this activates Stage 1.
// ---------------------------------------------------------------------------

const INITIAL_SURVEY: SurveyDefinition = {
  key: "initial",
  version: 1,
  title: "First Look: quick start survey",
  intro:
    "A one-minute survey so we understand who you are. Submitting it activates your First Look premium access.",
  estimatedTime: "About 1 minute",
  questions: [
    {
      id: "preparing_esat",
      type: "single",
      label: "Are you currently preparing to take the ESAT?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "probably", label: "Probably" },
        { value: "not_sure", label: "Not sure" },
        { value: "no", label: "No" },
      ],
    },
    {
      id: "modules",
      type: "multi",
      label: "Which modules are you preparing for?",
      options: [
        { value: "maths1", label: "Maths 1" },
        { value: "maths2", label: "Maths 2" },
        { value: "physics", label: "Physics" },
        { value: "chemistry", label: "Chemistry" },
        { value: "biology", label: "Biology" },
      ],
    },
    {
      id: "expected_sitting",
      type: "text",
      label: "When do you expect to take the ESAT?",
      help: "A date or exam cycle (e.g. \"October 2026\").",
      required: true,
    },
    {
      id: "hardest_area",
      type: "single",
      label: "Which area currently causes you the most difficulty?",
      options: [
        { value: "calc_speed", label: "Calculation speed" },
        { value: "accuracy", label: "Accuracy" },
        { value: "time_pressure", label: "Time pressure" },
        { value: "hard_questions", label: "Understanding difficult questions" },
        { value: "what_to_revise", label: "Knowing what to revise" },
        { value: "physics", label: "Physics problem-solving" },
        { value: "maths", label: "Maths problem-solving" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "confidence",
      type: "scale",
      label: "How confident do you currently feel about the ESAT?",
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "Not confident",
      scaleMaxLabel: "Very confident",
    },
    {
      id: "current_resources",
      type: "multi",
      label: "What are you currently using to prepare?",
      options: [
        { value: "past_papers", label: "Past papers" },
        { value: "school", label: "School resources" },
        { value: "tutor", label: "Tutor" },
        { value: "books", label: "Books" },
        { value: "online_banks", label: "Online question banks" },
        { value: "other", label: "Other" },
        { value: "nothing", label: "Nothing yet" },
      ],
    },
    {
      id: "value_to_pay",
      type: "longtext",
      label:
        "What would make an ESAT preparation app valuable enough for you to pay for?",
      required: false,
      maxLength: 1000,
    },
  ],
};

// ---------------------------------------------------------------------------
// Survey: Stage 1 feedback (~2-3 minutes). Completing (with >=1 session) unlocks Stage 2.
// ---------------------------------------------------------------------------

const STAGE_1_FEEDBACK_SURVEY: SurveyDefinition = {
  key: "stage_1_feedback",
  version: 1,
  title: "First Look feedback",
  intro:
    "Two to three minutes of feedback. Your answers help us improve the product, and unlock 7 more days of premium access.",
  estimatedTime: "About 2–3 minutes",
  questions: [
    {
      id: "completed_session",
      type: "single",
      label: "Did you complete at least one practice session?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    // Branch: NO
    {
      id: "no_session_reason",
      type: "single",
      label: "What stopped you from completing a session?",
      showIf: { q: "completed_session", anyOf: ["no"] },
      options: [
        { value: "no_time", label: "I did not have enough time" },
        { value: "forgot", label: "I forgot" },
        { value: "unclear", label: "I did not understand what to do" },
        { value: "no_value", label: "I did not see enough value" },
        { value: "technical", label: "I experienced a technical problem" },
        { value: "browsing", label: "I was only browsing" },
        { value: "other", label: "Other" },
      ],
    },
    // Branch: YES
    {
      id: "ease_of_start",
      type: "scale",
      label: "How easy was it to understand what to do first?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "Very hard",
      scaleMaxLabel: "Very easy",
    },
    {
      id: "most_useful",
      type: "text",
      label: "What was the most useful part of the app?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      required: false,
      maxLength: 500,
    },
    {
      id: "confusing",
      type: "text",
      label: "Was anything confusing or difficult to use?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      required: false,
      maxLength: 500,
    },
    {
      id: "missing",
      type: "text",
      label:
        "Was there anything you expected the app to include but could not find?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      required: false,
      maxLength: 500,
    },
    {
      id: "likely_return",
      type: "scale",
      label: "How likely are you to use the app again during the next week?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      scaleMin: 0,
      scaleMax: 10,
      scaleMinLabel: "Not likely",
      scaleMaxLabel: "Very likely",
    },
    {
      id: "reason_continue",
      type: "single",
      label: "What is the main reason you would continue using it?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      options: [
        { value: "speed", label: "Improve speed" },
        { value: "accuracy", label: "Improve accuracy" },
        { value: "regular", label: "Practise regularly" },
        { value: "weak_topics", label: "Identify weak topics" },
        { value: "esat", label: "Prepare specifically for ESAT" },
        { value: "progress", label: "Track progress" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "reason_stop",
      type: "single",
      label: "What is the main reason you might stop using it?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      options: [
        { value: "not_enough_content", label: "Not enough useful content" },
        { value: "repetitive", label: "Too repetitive" },
        { value: "hard_to_understand", label: "Difficult to understand" },
        { value: "no_score_belief", label: "I do not believe it will improve my score" },
        { value: "have_others", label: "I already have other resources" },
        { value: "forget", label: "I would forget to use it" },
        { value: "expensive", label: "It would be too expensive" },
        { value: "technical", label: "Technical problems" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "one_improvement",
      type: "longtext",
      label:
        "Is there one improvement that would make you much more likely to continue?",
      showIf: { q: "completed_session", anyOf: ["yes"] },
      required: false,
      maxLength: 1000,
    },
  ],
};

// ---------------------------------------------------------------------------
// Survey: Final detailed survey (~5 minutes). Completing (with >=3 sessions) unlocks Stage 3.
// ---------------------------------------------------------------------------

const FINAL_SURVEY: SurveyDefinition = {
  key: "final",
  version: 1,
  title: "Founding Tester: final survey",
  intro:
    "About five minutes. This is the most important feedback of the programme. Completing it unlocks 30 more days and your founding-member discount.",
  estimatedTime: "About 5 minutes",
  questions: [
    {
      id: "times_used",
      type: "single",
      label: "How many times do you remember using the app?",
      options: [
        { value: "once", label: "Once" },
        { value: "twice", label: "Two times" },
        { value: "3_5", label: "Three to five times" },
        { value: "6_plus", label: "Six or more times" },
      ],
    },
    {
      id: "parts_used",
      type: "multi",
      label: "Which parts did you use?",
      options: [
        { value: "mental_maths", label: "Mental maths practice" },
        { value: "drills", label: "Topic-specific drills" },
        { value: "question_bank", label: "Question bank" },
        { value: "progress", label: "Progress tracking" },
        { value: "fermi", label: "Fermi game" },
        { value: "score_converter", label: "Score converter" },
        { value: "diagnostic", label: "Diagnostic" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "most_value_part",
      type: "single",
      label: "Which single part provided the most value?",
      options: [
        { value: "mental_maths", label: "Mental maths practice" },
        { value: "drills", label: "Topic-specific drills" },
        { value: "question_bank", label: "Question bank" },
        { value: "progress", label: "Progress tracking" },
        { value: "fermi", label: "Fermi game" },
        { value: "score_converter", label: "Score converter" },
        { value: "diagnostic", label: "Diagnostic" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "benefit",
      type: "single",
      label: "What specific benefit did the app give you?",
      options: [
        { value: "speed", label: "Improved speed" },
        { value: "accuracy", label: "Improved accuracy" },
        { value: "confidence", label: "Increased confidence" },
        { value: "weaknesses", label: "Identified weaknesses" },
        { value: "structured", label: "Made revision more structured" },
        { value: "enjoyable", label: "Made practice more enjoyable" },
        { value: "saved_time", label: "Saved time finding questions" },
        { value: "none", label: "No clear benefit" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "benefit_explain",
      type: "longtext",
      label: "Briefly explain the main benefit in your own words.",
      required: false,
      maxLength: 1000,
    },
    {
      id: "performance_change",
      type: "single",
      label: "Did you notice any improvement in your performance?",
      options: [
        { value: "large", label: "A large improvement" },
        { value: "small", label: "A small improvement" },
        { value: "none", label: "No noticeable improvement" },
        { value: "not_enough", label: "I did not use it enough to tell" },
      ],
    },
    {
      id: "biggest_weakness",
      type: "single",
      label: "What was the biggest weakness or frustration?",
      options: [
        { value: "variety", label: "Not enough question variety" },
        { value: "repetitive", label: "Questions felt repetitive" },
        { value: "progress_unclear", label: "Progress was unclear" },
        { value: "recs", label: "Recommendations were not useful" },
        { value: "navigation", label: "Navigation was confusing" },
        { value: "technical", label: "Technical problems" },
        { value: "not_engaging", label: "Sessions were not engaging" },
        { value: "not_esat", label: "The product did not feel specific enough to ESAT" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "nearly_stopped",
      type: "text",
      label: "What nearly made you stop using the app?",
      required: false,
      maxLength: 500,
    },
    {
      id: "disappointment",
      type: "single",
      label: "How disappointed would you be if you could no longer use the app?",
      options: [
        { value: "very", label: "Very disappointed" },
        { value: "somewhat", label: "Somewhat disappointed" },
        { value: "not", label: "Not disappointed" },
      ],
    },
    {
      id: "recommend",
      type: "scale",
      label: "How likely are you to recommend it to another ESAT student?",
      scaleMin: 0,
      scaleMax: 10,
      scaleMinLabel: "Not likely",
      scaleMaxLabel: "Very likely",
    },
    {
      id: "pay_view",
      type: "single",
      label: "Which description best matches your view?",
      options: [
        { value: "definitely_pay", label: "I would definitely pay for it" },
        { value: "might_pay", label: "I might pay depending on the price" },
        { value: "only_free", label: "I would only use it for free" },
        { value: "not_continue", label: "I would not continue using it" },
      ],
    },
    // Branch A: would/might pay
    {
      id: "payment_structure",
      type: "single",
      label: "Which payment structure would you prefer?",
      showIf: { q: "pay_view", anyOf: ["definitely_pay", "might_pay"] },
      options: [
        { value: "monthly", label: "Monthly subscription" },
        { value: "season", label: "One payment for the full ESAT season" },
        { value: "tiered", label: "A cheaper basic plan and a more expensive complete plan" },
        { value: "not_sure", label: "Not sure" },
      ],
    },
    {
      id: "acceptable_price",
      type: "single",
      label:
        "What is the highest one-off price that would feel reasonable for full ESAT-season access?",
      showIf: { q: "pay_view", anyOf: ["definitely_pay", "might_pay"] },
      options: [
        { value: "under_15", label: "Under £15" },
        { value: "15_29", label: "£15–£29" },
        { value: "30_49", label: "£30–£49" },
        { value: "50_69", label: "£50–£69" },
        { value: "70_plus", label: "£70 or more" },
      ],
    },
    {
      id: "would_pay_49",
      type: "single",
      label: "Would you personally pay £49 for full access until the ESAT?",
      showIf: { q: "pay_view", anyOf: ["definitely_pay", "might_pay"] },
      options: [
        { value: "yes", label: "Yes" },
        { value: "maybe", label: "Maybe" },
        { value: "no", label: "No" },
      ],
    },
    {
      id: "why_not_49",
      type: "single",
      label: "Why?",
      showIf: { q: "would_pay_49", anyOf: ["maybe", "no"] },
      options: [
        { value: "expensive", label: "Too expensive" },
        { value: "not_convinced", label: "I am not yet convinced it improves results" },
        { value: "not_long_enough", label: "I do not need it for long enough" },
        { value: "pay_others", label: "I already pay for other resources" },
        { value: "infrequent", label: "I would not use it frequently enough" },
        { value: "incomplete", label: "The content is not complete enough" },
        { value: "prefer_monthly", label: "I would prefer a monthly plan" },
        { value: "other", label: "Other" },
      ],
    },
    // Branch B: only free / not continue
    {
      id: "why_not_pay",
      type: "single",
      label: "What is the main reason you would not pay?",
      showIf: { q: "pay_view", anyOf: ["only_free", "not_continue"] },
      options: [
        { value: "no_benefit", label: "I do not see enough benefit" },
        { value: "infrequent", label: "I do not use it often enough" },
        { value: "free_elsewhere", label: "I can practise elsewhere for free" },
        { value: "quality", label: "I do not trust the quality enough yet" },
        { value: "more_content", label: "It needs more content" },
        { value: "progress_tracking", label: "It needs better progress tracking" },
        { value: "not_serious", label: "I am not serious enough about ESAT preparation" },
        { value: "afford", label: "I cannot afford another resource" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "change_to_pay",
      type: "longtext",
      label: "What would need to change before you would consider paying?",
      showIf: { q: "pay_view", anyOf: ["only_free", "not_continue"] },
      required: false,
      maxLength: 1000,
    },
    // Everyone
    {
      id: "most_important_improvement",
      type: "longtext",
      label: "What is the single most important improvement we should make?",
      required: false,
      maxLength: 1000,
    },
    {
      id: "follow_up_ok",
      type: "single",
      label:
        "May we contact you for one short follow-up conversation about your answers?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
    },
    {
      id: "testimonial_willing",
      type: "single",
      label: "Would you be willing to provide a short testimonial?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "maybe_later", label: "Maybe later" },
        { value: "no", label: "No" },
      ],
    },
    {
      id: "testimonial_text",
      type: "longtext",
      label: "Write one or two sentences describing your honest experience.",
      showIf: { q: "testimonial_willing", anyOf: ["yes"] },
      required: true,
      maxLength: 600,
    },
    {
      id: "testimonial_display",
      type: "single",
      label: "May we display this testimonial publicly?",
      showIf: { q: "testimonial_willing", anyOf: ["yes"] },
      options: [
        { value: "first_name", label: "Yes, with my first name" },
        { value: "anonymous", label: "Yes, anonymously" },
        { value: "private", label: "No, keep it private" },
      ],
    },
  ],
};

export const TESTER_SURVEYS: Record<SurveyKey, SurveyDefinition> = {
  initial: INITIAL_SURVEY,
  stage_1_feedback: STAGE_1_FEEDBACK_SURVEY,
  final: FINAL_SURVEY,
};

export function getSurvey(key: SurveyKey): SurveyDefinition {
  return TESTER_SURVEYS[key];
}
