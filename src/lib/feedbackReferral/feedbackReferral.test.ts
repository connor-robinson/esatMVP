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
  isFeedbackStepComplete,
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
      }),
    ).toBe(true);
  });

  it("lets preview emails in while gated", () => {
    expect(
      canAccessFeedbackReferral({
        email: "Anson@example.com",
        role: "user",
        live: false,
        previewEmails: ["anson@example.com"],
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
      }),
    ).toBe(false);
  });

  it("opens to everyone when live", () => {
    expect(
      canAccessFeedbackReferral({
        email: "student@example.com",
        role: "user",
        live: true,
        previewEmails: [],
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
    "Past paper scores reset to zero after I finish a section, so I cannot track progress.";

  it("rejects thin written answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "parts_used", value: ["past_papers"] },
      { questionId: "recommend", value: 8 },
      { questionId: "improve_first", value: "fix it" },
    ]);
    expect(error).toMatch(/at least/i);
  });

  it("accepts concise friendly answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "parts_used", value: ["past_papers", "question_bank"] },
      { questionId: "recommend", value: 7 },
      { questionId: "improve_first", value: improve },
      { questionId: "works_well", value: "Calibration felt clear and quick." },
    ]);
    expect(error).toBeNull();
  });

  it("allows skipping the optional liked question", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "parts_used", value: ["calibration"] },
      { questionId: "recommend", value: 9 },
      { questionId: "improve_first", value: improve },
    ]);
    expect(error).toBeNull();
  });

  it("rejects copy-pasted identical text", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "parts_used", value: ["calibration"] },
      { questionId: "recommend", value: 5 },
      { questionId: "improve_first", value: improve },
      { questionId: "works_well", value: improve },
    ]);
    expect(error).toMatch(/different answers/i);
  });
});

describe("step completion", () => {
  const multiQ: FeedbackQuestion = {
    id: "parts_used",
    type: "multi",
    label: "What have you tried?",
    options: [{ value: "calibration", label: "Calibration" }],
  };
  const textQ: FeedbackQuestion = {
    id: "improve_first",
    type: "longtext",
    label: "Improve?",
    required: true,
    minLength: 20,
  };
  const optionalQ: FeedbackQuestion = {
    id: "works_well",
    type: "longtext",
    label: "Liked?",
    required: false,
  };

  it("requires a multi selection", () => {
    expect(isFeedbackStepComplete(multiQ, [])).toBe(false);
    expect(isFeedbackStepComplete(multiQ, ["calibration"])).toBe(true);
  });

  it("enforces min length on required text", () => {
    expect(isFeedbackStepComplete(textQ, "short")).toBe(false);
    expect(isFeedbackStepComplete(textQ, "a".repeat(20))).toBe(true);
  });

  it("lets optional text steps continue empty", () => {
    expect(isFeedbackStepComplete(optionalQ, undefined)).toBe(true);
    expect(isFeedbackStepComplete(optionalQ, "")).toBe(true);
  });
});
