import { describe, expect, it } from "vitest";
import {
  buildHomeLaunchQuestionsUrl,
  fingerprintHomeLaunch,
  sessionQuestionPoolLimit,
} from "@/lib/questionBank/sessionLaunchPrefetch";
import type { QuestionBankHomeLaunchPayload } from "@/lib/questionBank/homeLaunch";

const samplePayload: QuestionBankHomeLaunchPayload = {
  testType: "ESAT",
  subjects: ["Math 1"],
  timeLimitMinutes: 45,
  questionCount: 30,
  difficulties: ["Easy", "Medium", "Hard"],
  difficultyMix: "Auto",
};

describe("sessionLaunchPrefetch", () => {
  it("sizes the question pool tightly around the requested count", () => {
    expect(sessionQuestionPoolLimit(30)).toBe(120);
    expect(sessionQuestionPoolLimit(5)).toBe(45);
  });

  it("builds a random subject-scoped fetch URL", () => {
    const url = buildHomeLaunchQuestionsUrl(samplePayload);
    expect(url).toContain("/api/question-bank/questions?");
    expect(url).toContain("testType=ESAT");
    expect(url).toContain("subject=Math+1");
    expect(url).toContain("limit=120");
    expect(url).toContain("random=true");
    expect(url).toContain("attemptedStatus=New");
    expect(url).not.toContain("attemptResult=");
  });

  it("builds an incorrect-only fetch URL without New filter", () => {
    const url = buildHomeLaunchQuestionsUrl({
      ...samplePayload,
      incorrectOnly: true,
      playMode: "exam",
    });
    expect(url).toContain("attemptResult=Incorrect+Before");
    expect(url).not.toContain("attemptedStatus=");
  });

  it("fingerprints launches by session settings", () => {
    const a = fingerprintHomeLaunch(samplePayload);
    const b = fingerprintHomeLaunch({
      ...samplePayload,
      questionCount: 31,
    });
    expect(a).not.toEqual(b);
    const c = fingerprintHomeLaunch({
      ...samplePayload,
      incorrectOnly: true,
    });
    expect(a).not.toEqual(c);
  });
});
