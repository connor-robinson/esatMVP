import { describe, expect, it } from "vitest";
import {
  canAccessFeedbackReferral,
  DEFAULT_FEEDBACK_REFERRAL_PREVIEW_EMAILS,
  isFeedbackReferralLive,
  parsePreviewEmails,
} from "@/lib/feedbackReferral/access";
import {
  generateReferralCode,
  isReferralCodeFormat,
  normalizeReferralCode,
} from "@/lib/feedbackReferral/codes";
import {
  hasWrittenBeyondExamples,
  isFeedbackStepComplete,
  matchesExampleExactly,
  validateFeedbackReferralSurvey,
  type FeedbackQuestion,
} from "@/lib/feedbackReferral/survey";

describe("feedback referral access", () => {
  it("parses preview emails and keeps built-in testers", () => {
    expect(parsePreviewEmails("a@x.com, B@X.com ; c@x.com")).toEqual([
      ...DEFAULT_FEEDBACK_REFERRAL_PREVIEW_EMAILS.map((email) =>
        email.toLowerCase(),
      ),
      "a@x.com",
      "b@x.com",
      "c@x.com",
    ]);
  });

  it("lets admins in while gated", () => {
    expect(
      canAccessFeedbackReferral({
        email: "someone@example.com",
        role: "admin",
        live: false,
        previewEmails: [],
        activeDays: 0,
      }),
    ).toBe(true);
  });

  it("lets preview emails in only with 3+ active days", () => {
    expect(
      canAccessFeedbackReferral({
        email: "Anson@example.com",
        role: "user",
        live: false,
        previewEmails: ["anson@example.com"],
        activeDays: 2,
      }),
    ).toBe(false);
    expect(
      canAccessFeedbackReferral({
        email: "Anson@example.com",
        role: "user",
        live: false,
        previewEmails: ["anson@example.com"],
        activeDays: 3,
      }),
    ).toBe(true);
  });

  it("blocks everyone else while gated", () => {
    expect(
      canAccessFeedbackReferral({
        email: "student@example.com",
        role: "user",
        live: false,
        previewEmails: ["anson@example.com"],
        activeDays: 10,
      }),
    ).toBe(false);
  });

  it("requires 3 active days when live", () => {
    expect(
      canAccessFeedbackReferral({
        email: "student@example.com",
        role: "user",
        live: true,
        previewEmails: [],
        activeDays: 2,
      }),
    ).toBe(false);
    expect(
      canAccessFeedbackReferral({
        email: "student@example.com",
        role: "user",
        live: true,
        previewEmails: [],
        activeDays: 3,
      }),
    ).toBe(true);
  });

  it("lets admins in when live even without tenure", () => {
    expect(
      canAccessFeedbackReferral({
        email: "someone@example.com",
        role: "admin",
        live: true,
        previewEmails: [],
        activeDays: 0,
      }),
    ).toBe(true);
  });

  it("reads live flag from env-like values", () => {
    expect(isFeedbackReferralLive()).toBe(false);
  });
});

describe("referral codes", () => {
  it("generates CAMP50 codes", () => {
    const code = generateReferralCode();
    expect(isReferralCodeFormat(code)).toBe(true);
    expect(normalizeReferralCode(` ${code.toLowerCase()} `)).toBe(code);
  });
});

describe("survey validation", () => {
  const improve =
    "Some Math 1 questions feel too easy compared with the real exam, especially the early algebra ones that skip the harder style.";
  const examples = [
    "Some Math 1 questions feel too easy compared with the real exam",
    "I found a Math 1 question that looked incorrect or had a wrong answer",
    "It's unclear how to leave the question bank once I'm in a set",
  ];

  it("rejects thin written answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "past_papers" },
      { questionId: "least_useful", value: "score_converter" },
      { questionId: "recommend", value: 8 },
      { questionId: "improve_first", value: "fix it" },
    ]);
    expect(error).toMatch(/at least/i);
  });

  it("rejects an example tapped with nothing added", () => {
    expect(matchesExampleExactly(examples[0]!, examples)).toBe(true);
    expect(hasWrittenBeyondExamples(examples[0]!, examples)).toBe(false);
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "question_bank" },
      { questionId: "least_useful", value: "past_papers" },
      { questionId: "recommend", value: 7 },
      { questionId: "improve_first", value: examples[0]! },
    ]);
    expect(error).toMatch(/own detail/i);
  });

  it("accepts an example plus the user's own detail", () => {
    const withDetail = `${examples[1]!} Topic looked like logs but the mark scheme felt off.`;
    expect(hasWrittenBeyondExamples(withDetail, examples)).toBe(true);
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "question_bank" },
      { questionId: "least_useful", value: "past_papers" },
      { questionId: "recommend", value: 7 },
      { questionId: "improve_first", value: withDetail },
      { questionId: "works_well", value: "Calibration felt clear and quick." },
    ]);
    expect(error).toBeNull();
  });

  it("accepts concise friendly answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "question_bank" },
      { questionId: "least_useful", value: "past_papers" },
      { questionId: "recommend", value: 7 },
      { questionId: "improve_first", value: improve },
      { questionId: "works_well", value: "Calibration felt clear and quick." },
    ]);
    expect(error).toBeNull();
  });

  it("allows skipping the optional liked question", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "calibration" },
      { questionId: "least_useful", value: "other" },
      { questionId: "recommend", value: 9 },
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toBeNull();
  });

  it("rejects copy-pasted identical text", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "calibration" },
      { questionId: "least_useful", value: "mental_maths" },
      { questionId: "recommend", value: 5 },
      { questionId: "improve_first", value: improve },
      { questionId: "works_well", value: improve },
    ]);
    expect(error).toMatch(/different answers/i);
  });
});

describe("step completion", () => {
  const singleQ: FeedbackQuestion = {
    id: "most_useful",
    type: "single",
    label: "What's most useful?",
    options: [{ value: "calibration", label: "Calibration" }],
  };
  const textQ: FeedbackQuestion = {
    id: "improve_first",
    type: "longtext",
    label: "Improve?",
    required: true,
    minLength: 28,
  };
  const optionalQ: FeedbackQuestion = {
    id: "works_well",
    type: "longtext",
    label: "Liked?",
    required: false,
  };

  it("requires a single selection", () => {
    expect(isFeedbackStepComplete(singleQ, undefined)).toBe(false);
    expect(isFeedbackStepComplete(singleQ, "calibration")).toBe(true);
  });

  it("enforces min length on required text", () => {
    expect(isFeedbackStepComplete(textQ, "short")).toBe(false);
    expect(
      isFeedbackStepComplete(textQ, "a".repeat(28)),
    ).toBe(true);
  });

  it("lets optional text steps continue empty", () => {
    expect(isFeedbackStepComplete(optionalQ, undefined)).toBe(true);
    expect(isFeedbackStepComplete(optionalQ, "")).toBe(true);
  });
});
