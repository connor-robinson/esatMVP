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
    expect(sessionQuestionPoolLimit(30)).toBe(60);
    expect(sessionQuestionPoolLimit(5)).toBe(20);
  });

  it("builds a random subject-scoped fetch URL", () => {
    const url = buildHomeLaunchQuestionsUrl(samplePayload);
    expect(url).toContain("/api/question-bank/questions?");
    expect(url).toContain("testType=ESAT");
    expect(url).toContain("subject=Math+1");
    expect(url).toContain("limit=60");
    expect(url).toContain("random=true");
  });

  it("fingerprints launches by session settings", () => {
    const a = fingerprintHomeLaunch(samplePayload);
    const b = fingerprintHomeLaunch({
      ...samplePayload,
      questionCount: 31,
    });
    expect(a).not.toEqual(b);
  });
});
