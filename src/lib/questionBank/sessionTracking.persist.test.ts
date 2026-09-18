import { afterEach, describe, expect, it, vi } from "vitest";
import { persistQuestionBankAttempts } from "@/lib/questionBank/sessionTracking";

describe("persistQuestionBankAttempts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts each attempt and clears home progress cache when any succeed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { saved, failed } = await persistQuestionBankAttempts({
      attempts: [
        {
          questionId: "q1",
          userAnswer: "A",
          isCorrect: true,
          timeSpentMs: 1000,
        },
        {
          questionId: "q2",
          userAnswer: "",
          isCorrect: false,
          timeSpentMs: 0,
        },
      ],
      sessionId: "sess-1",
    });

    expect(saved).toBe(2);
    expect(failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(firstBody).toMatchObject({
      question_id: "q1",
      user_answer: "A",
      is_correct: true,
      session_id: "sess-1",
    });
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1]![1] as RequestInit).body as string,
    );
    expect(secondBody.user_answer).toBe("");
  });

  it("counts failed posts without throwing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { saved, failed } = await persistQuestionBankAttempts({
      attempts: [
        {
          questionId: "q1",
          userAnswer: "B",
          isCorrect: false,
          timeSpentMs: 50,
        },
        {
          questionId: "q2",
          userAnswer: "C",
          isCorrect: true,
          timeSpentMs: 80,
        },
      ],
    });

    expect(saved).toBe(1);
    expect(failed).toBe(1);
  });
});
