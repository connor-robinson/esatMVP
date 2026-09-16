import { describe, expect, it } from "vitest";
import {
  buildHomeLaunchQuestionsUrl,
  fingerprintHomeLaunch,
  sampleMixedSessionQuestions,
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
    const url = buildHomeLaunchQuestionsUrl(samplePayload, {
      authenticated: true,
    });
    expect(url).toContain("/api/question-bank/questions?");
    expect(url).toContain("testType=ESAT");
    expect(url).toContain("subject=Math+1");
    expect(url).toContain("limit=120");
    expect(url).toContain("random=true");
    expect(url).toContain("attemptedStatus=New");
    expect(url).not.toContain("attemptResult=");
  });

  it("omits New filter for guests so exam mode can load without auth", () => {
    const url = buildHomeLaunchQuestionsUrl(samplePayload, {
      authenticated: false,
    });
    expect(url).not.toContain("attemptedStatus=");
    expect(url).toContain("random=true");
  });

  it("builds an incorrect-only fetch URL without New filter", () => {
    const url = buildHomeLaunchQuestionsUrl({
      ...samplePayload,
      questionPool: "incorrect",
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
      questionPool: "mixed",
    });
    expect(a).not.toEqual(c);
  });

  it("samples a mixed session without duplicate ids", () => {
    const incorrect = Array.from({ length: 6 }, (_, i) => ({
      id: `wrong-${i}`,
      difficulty: "Medium" as const,
    }));
    const fresh = Array.from({ length: 8 }, (_, i) => ({
      id: `new-${i}`,
      difficulty: "Easy" as const,
    }));
    const picked = sampleMixedSessionQuestions(incorrect, fresh, 10, "Auto");
    expect(picked).toHaveLength(10);
    expect(new Set(picked.map((q) => q.id)).size).toBe(10);
    expect(picked.filter((q) => q.id.startsWith("wrong-")).length).toBeGreaterThanOrEqual(4);
  });
});
