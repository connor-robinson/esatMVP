import { describe, expect, it } from "vitest";
import { autoScoreSessionRow } from "@/lib/papers/autoScoreSessionRow";

describe("autoScoreSessionRow", () => {
  const questions = [
    { question_number: 1, answer_letter: "A" },
    { question_number: 2, answer_letter: "B" },
    { question_number: 3, answer_letter: "C" },
  ];

  it("regrades ended sessions with answers and score.correct 0", () => {
    const result = autoScoreSessionRow(
      {
        id: "s1",
        paper_id: 1,
        ended_at: "2026-09-01T00:00:00Z",
        question_start: 1,
        question_end: 3,
        answers: [{ choice: "A" }, { choice: "A" }, { choice: "C" }],
        correct_flags: [null, null, null],
        score: { correct: 0, total: 3 },
      },
      questions,
    );
    expect(result?.changed).toBe(true);
    expect(result?.score).toEqual({ correct: 2, total: 3 });
    expect(result?.correct_flags).toEqual([true, false, true]);
  });

  it("skips empty sittings", () => {
    const result = autoScoreSessionRow(
      {
        id: "s1",
        paper_id: 1,
        ended_at: "2026-09-01T00:00:00Z",
        answers: [{ choice: null }],
        correct_flags: [null],
        score: { correct: 0, total: 1 },
      },
      questions,
    );
    expect(result).toBeNull();
  });
});
