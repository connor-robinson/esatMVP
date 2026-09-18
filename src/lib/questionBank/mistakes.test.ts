import { describe, expect, it } from "vitest";
import {
  aggregateQbMistakePool,
  selectQbMistakeItems,
  summarizeQbMistakePool,
} from "@/lib/questionBank/mistakes";

describe("question bank mistakes pool", () => {
  const meta = new Map([
    [
      "q1",
      { subjects: "Math 1", test_type: "ESAT", primary_tag: "algebra" },
    ],
    [
      "q2",
      { subjects: "Paper 1", test_type: "TMUA", primary_tag: "logic" },
    ],
  ]);

  const sessions = [
    {
      id: "mistakes-1",
      source: "mistakes",
      summary: { kind: "mistakes" },
    },
    { id: "home-1", source: "home", summary: {} },
  ];

  const attempts = [
    {
      question_id: "q1",
      user_answer: "A",
      is_correct: false,
      time_spent_ms: 30000,
      attempted_at: "2026-01-01T00:00:00.000Z",
      session_id: "home-1",
    },
    {
      question_id: "q1",
      user_answer: "B",
      is_correct: false,
      time_spent_ms: 20000,
      attempted_at: "2026-01-02T00:00:00.000Z",
      session_id: "home-1",
    },
    {
      question_id: "q2",
      user_answer: "C",
      is_correct: false,
      time_spent_ms: 40000,
      attempted_at: "2026-01-03T00:00:00.000Z",
      session_id: "home-1",
    },
    {
      question_id: "q2",
      user_answer: "D",
      is_correct: true,
      time_spent_ms: 25000,
      attempted_at: "2026-01-04T00:00:00.000Z",
      session_id: "mistakes-1",
    },
  ];

  it("aggregates wrongs and marks Mistakes reviews", () => {
    const items = aggregateQbMistakePool(attempts, sessions, meta);
    expect(items).toHaveLength(2);
    const q1 = items.find((i) => i.questionId === "q1")!;
    const q2 = items.find((i) => i.questionId === "q2")!;
    expect(q1.timesWrong).toBe(2);
    expect(q1.neverReviewed).toBe(true);
    expect(q2.timesWrong).toBe(1);
    expect(q2.neverReviewed).toBe(false);
    expect(q2.timesSeenInMistakes).toBe(1);
    expect(q2.lastMistakesOutcome).toBe("correct");
  });

  it("summarizes and prefers unreviewed", () => {
    const items = aggregateQbMistakePool(attempts, sessions, meta);
    const summary = summarizeQbMistakePool(items);
    expect(summary.totalIncorrect).toBe(2);
    expect(summary.untouched).toBe(1);
    expect(summary.byExam.ESAT).toBe(1);
    expect(summary.byExam.TMUA).toBe(1);

    const picked = selectQbMistakeItems(items, {
      mode: "unreviewed",
      exam: "ALL",
      count: 1,
    });
    expect(picked[0]?.questionId).toBe("q1");
  });

  it("sorts most missed", () => {
    const items = aggregateQbMistakePool(attempts, sessions, meta);
    const picked = selectQbMistakeItems(items, {
      mode: "most_missed",
      exam: "ALL",
      count: 2,
    });
    expect(picked[0]?.questionId).toBe("q1");
  });
});
