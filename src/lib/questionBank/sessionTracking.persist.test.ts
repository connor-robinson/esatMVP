import { afterEach, describe, expect, it, vi } from "vitest";
import { persistQuestionBankAttempts } from "@/lib/questionBank/sessionTracking";

describe("persistQuestionBankAttempts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts the full set via the batch endpoint and clears cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ saved: 2 }),
    });
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/question-bank/attempts/batch");
    const firstBody = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(firstBody.attempts).toHaveLength(2);
    expect(firstBody.attempts[0]).toMatchObject({
      question_id: "q1",
      user_answer: "A",
      is_correct: true,
      session_id: "sess-1",
    });
    expect(firstBody.attempts[1].user_answer).toBe("");
  });

  it("falls back to sequential posts when batch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "batch down" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
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

    expect(saved).toBe(2);
    expect(failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toBe("/api/question-bank/attempts");
  });

  it("throws when neither batch nor sequential can save all attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "batch down" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      persistQuestionBankAttempts({
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
      }),
    ).rejects.toThrow(/Failed to save/);
  });
});
