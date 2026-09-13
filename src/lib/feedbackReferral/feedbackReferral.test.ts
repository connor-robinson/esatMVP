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
import { FeedbackReferralError } from "@/lib/feedbackReferral/service";
import {
  hasWrittenBeyondExamples,
  isFeedbackStepComplete,
  matchesExampleExactly,
  validateFeedbackReferralSurvey,
  type FeedbackQuestion,
} from "@/lib/feedbackReferral/survey";

describe("resolveCheckoutReferralDiscount guards", () => {
  it("exposes FeedbackReferralError with status", () => {
    const err = new FeedbackReferralError("You cannot use your own referral code.", 400);
    expect(err.message).toMatch(/own referral code/i);
    expect(err.status).toBe(400);
  });
});

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
    "You could do a better job getting found on Google when people search for ESAT practice, especially with clearer landing pages.";
  const examples = [
    "You could do a better job getting found on Google when people search for ESAT practice",
    "Lots of Biology questions are being displayed incorrectly",
    "It's unclear how to leave the question bank once I'm in a set",
  ];

  const describeFriend =
    "Timed ESAT practice that feels close to the real exam.";

  const baseAnswers = [
    { questionId: "most_useful", value: "question_bank" },
    { questionId: "least_useful", value: "past_papers" },
    { questionId: "recommend", value: 7 },
    { questionId: "describe_friend", value: describeFriend },
    { questionId: "recommend_more", value: "cheaper" },
    { questionId: "spread_word", value: "Friends recommending it in group chats." },
    { questionId: "price_fair", value: "fair" },
    { questionId: "almost_stopped", value: ["nothing"] },
    { questionId: "camp_missing", value: ["more_mock_papers"] },
  ] as const;

  it("rejects thin written answers", () => {
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers,
      { questionId: "improve_first", value: "fix it" },
    ]);
    expect(error).toMatch(/at least/i);
  });

  it("rejects an example tapped with nothing added", () => {
    expect(matchesExampleExactly(examples[0]!, examples)).toBe(true);
    expect(hasWrittenBeyondExamples(examples[0]!, examples)).toBe(false);
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers,
      { questionId: "improve_first", value: examples[0]! },
    ]);
    expect(error).toMatch(/own detail/i);
  });

  it("requires describe_friend after recommend", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "question_bank" },
      { questionId: "least_useful", value: "past_papers" },
      { questionId: "recommend", value: 7 },
      { questionId: "recommend_more", value: "cheaper" },
      { questionId: "spread_word", value: "Friends recommending it in group chats." },
      { questionId: "price_fair", value: "fair" },
      { questionId: "almost_stopped", value: ["nothing"] },
      { questionId: "camp_missing", value: ["more_mock_papers"] },
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toMatch(/describe ESATCamp/i);
  });

  it("requires technical detail when technical is selected", () => {
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers.slice(0, 7),
      { questionId: "almost_stopped", value: ["technical", "price"] },
      { questionId: "camp_missing", value: ["more_mock_papers"] },
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toMatch(/technical issue/i);
  });

  it("requires other detail for camp_missing other", () => {
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers.slice(0, 8),
      { questionId: "camp_missing", value: ["other"] },
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toMatch(/like to see/i);
  });

  it("accepts an example plus the user's own detail", () => {
    const withDetail = `${examples[1]!} Topic looked like logs but the mark scheme felt off.`;
    expect(hasWrittenBeyondExamples(withDetail, examples)).toBe(true);
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers,
      { questionId: "improve_first", value: withDetail },
      { questionId: "works_well", value: "Calibration felt clear and quick." },
    ]);
    expect(error).toBeNull();
  });

  it("accepts concise friendly answers", () => {
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers,
      { questionId: "almost_stopped_technical", value: "Timer froze on mobile mid paper." },
      { questionId: "improve_first", value: improve },
      { questionId: "works_well", value: "Calibration felt clear and quick." },
      { questionId: "anything_else", value: "Would love more physics later." },
    ]);
    // technical detail without technical selected is ignored; still valid
    expect(error).toBeNull();
  });

  it("allows skipping optional text questions", () => {
    const error = validateFeedbackReferralSurvey([
      ...baseAnswers,
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toBeNull();
  });

  it("rejects copy-pasted identical text", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "most_useful", value: "calibration" },
      { questionId: "least_useful", value: "mental_maths" },
      { questionId: "recommend", value: 5 },
      { questionId: "describe_friend", value: improve },
      { questionId: "recommend_more", value: "better_questions" },
      { questionId: "spread_word", value: improve },
      { questionId: "price_fair", value: "fair" },
      { questionId: "almost_stopped", value: ["nothing"] },
      { questionId: "camp_missing", value: ["more_mock_papers"] },
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
  const recommendQ: FeedbackQuestion = {
    id: "recommend",
    type: "scale",
    label: "Would you recommend us to a friend?",
    scaleMin: 0,
    scaleMax: 10,
    followUpText: {
      id: "describe_friend",
      label: "In one sentence, how would you describe ESATCamp to a friend?",
      minLength: 12,
    },
  };
  const almostStoppedQ: FeedbackQuestion = {
    id: "almost_stopped",
    type: "multi",
    label: "What almost stopped you?",
    options: [
      { value: "technical", label: "Technical issues" },
      { value: "price", label: "Price" },
    ],
    requiredDetails: [
      {
        optionValue: "technical",
        id: "almost_stopped_technical",
        label: "What technical issue did you hit?",
        minLength: 8,
      },
    ],
  };

  it("requires a single selection", () => {
    expect(isFeedbackStepComplete(singleQ, undefined)).toBe(false);
    expect(isFeedbackStepComplete(singleQ, "calibration")).toBe(true);
  });

  it("enforces min length on required text", () => {
    expect(isFeedbackStepComplete(textQ, "short")).toBe(false);
    expect(isFeedbackStepComplete(textQ, "a".repeat(28))).toBe(true);
  });

  it("lets optional text steps continue empty", () => {
    expect(isFeedbackStepComplete(optionalQ, undefined)).toBe(true);
    expect(isFeedbackStepComplete(optionalQ, "")).toBe(true);
  });

  it("blocks continue until describe follow-up is filled", () => {
    expect(isFeedbackStepComplete(recommendQ, 8, {})).toBe(false);
    expect(
      isFeedbackStepComplete(recommendQ, 8, {
        describe_friend: "short",
      }),
    ).toBe(false);
    expect(
      isFeedbackStepComplete(recommendQ, 8, {
        describe_friend: "Timed practice that feels like the real exam.",
      }),
    ).toBe(true);
  });

  it("requires technical detail when selected", () => {
    expect(
      isFeedbackStepComplete(almostStoppedQ, ["technical"], {}),
    ).toBe(false);
    expect(
      isFeedbackStepComplete(almostStoppedQ, ["technical"], {
        almost_stopped_technical: "Timer froze",
      }),
    ).toBe(true);
    expect(isFeedbackStepComplete(almostStoppedQ, ["price"], {})).toBe(true);
  });
});
