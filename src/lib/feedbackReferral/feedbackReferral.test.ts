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
import { validateFeedbackReferralSurvey } from "@/lib/feedbackReferral/survey";

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
  const detailed = {
    works:
      "The NSAA 2019 paper timer and the way answers persist when I leave the page.",
    improve:
      "The past-paper score showing 0 correct even after I answered a full section. I cannot tell if I am improving.",
    broken:
      "Question bank felt fine, but switching modules dumped me back to the start of the list.",
  };

  it("rejects thin written answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "time_using", value: "today" },
      { questionId: "parts_used", value: ["past_papers"] },
      { questionId: "recommend", value: 8 },
      { questionId: "works_well", value: "good" },
      { questionId: "improve_first", value: "fix papers" },
      { questionId: "broken_or_confusing", value: "ui" },
    ]);
    expect(error).toMatch(/at least/i);
  });

  it("accepts detailed answers", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "time_using", value: "week_plus" },
      { questionId: "parts_used", value: ["past_papers", "question_bank"] },
      { questionId: "recommend", value: 7 },
      { questionId: "works_well", value: detailed.works },
      { questionId: "improve_first", value: detailed.improve },
      { questionId: "broken_or_confusing", value: detailed.broken },
    ]);
    expect(error).toBeNull();
  });

  it("rejects copy-pasted identical text", () => {
    const error = validateFeedbackReferralSurvey([
      { questionId: "time_using", value: "today" },
      { questionId: "parts_used", value: ["calibration"] },
      { questionId: "recommend", value: 5 },
      { questionId: "works_well", value: detailed.improve },
      { questionId: "improve_first", value: detailed.improve },
      { questionId: "broken_or_confusing", value: detailed.improve },
    ]);
    expect(error).toMatch(/different answers/i);
  });
});
