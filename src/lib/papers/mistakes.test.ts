import { describe, expect, it } from "vitest";
import {
  aggregateMistakePool,
  selectMistakeItems,
  type MistakePoolItem,
} from "@/lib/papers/mistakes";
import type { PaperSessionRow } from "@/lib/supabase/types";

function baseItem(
  overrides: Partial<MistakePoolItem> & Pick<MistakePoolItem, "key">,
): MistakePoolItem {
  return {
    paperId: 1,
    paperName: "Section 1",
    paperVariant: "2023",
    examName: "NSAA",
    subject: "Mathematics",
    questionNumber: 1,
    questionId: 10,
    timesWrong: 1,
    timesSeenInMistakes: 0,
    lastWrongAt: 1_000,
    lastReviewedAt: null,
    lastMistakesOutcome: null,
    neverReviewed: true,
    history: [],
    ...overrides,
  };
}

describe("selectMistakeItems", () => {
  it("prefers unreviewed and only recycles when fresh pool is empty", () => {
    const items = [
      baseItem({ key: "fresh-1", questionNumber: 1, neverReviewed: true }),
      baseItem({ key: "fresh-2", questionNumber: 2, neverReviewed: true }),
      baseItem({
        key: "old-1",
        questionNumber: 3,
        neverReviewed: false,
        timesSeenInMistakes: 1,
        lastReviewedAt: 2_000,
      }),
    ];

    const onlyFresh = selectMistakeItems(items, {
      mode: "unreviewed",
      exam: "ALL",
      count: 2,
    });
    expect(onlyFresh).toHaveLength(2);
    expect(onlyFresh.every((i) => i.neverReviewed)).toBe(true);

    const withRecycle = selectMistakeItems(items, {
      mode: "unreviewed",
      exam: "ALL",
      count: 3,
    });
    expect(withRecycle).toHaveLength(3);
    expect(withRecycle.filter((i) => i.neverReviewed)).toHaveLength(2);
    expect(withRecycle.some((i) => i.key === "old-1")).toBe(true);
  });

  it("orders most missed by timesWrong", () => {
    const items = [
      baseItem({ key: "a", timesWrong: 2, questionNumber: 1 }),
      baseItem({ key: "b", timesWrong: 5, questionNumber: 2 }),
      baseItem({ key: "c", timesWrong: 3, questionNumber: 3 }),
    ];
    const picked = selectMistakeItems(items, {
      mode: "most_missed",
      exam: "ALL",
      count: 3,
    });
    expect(picked.map((i) => i.key)).toEqual(["b", "c", "a"]);
  });
});

describe("aggregateMistakePool", () => {
  it("marks questions reviewed after a Mistakes session", () => {
    const paperRow = {
      id: "s1",
      user_id: "u1",
      paper_id: 42,
      paper_name: "NSAA",
      paper_variant: "2023 Section 1",
      session_name: "Practice",
      question_start: 1,
      question_end: 2,
      selected_sections: [],
      selected_part_ids: [],
      question_order: [1, 2],
      time_limit_minutes: 40,
      started_at: new Date(1_000).toISOString(),
      ended_at: new Date(2_000).toISOString(),
      deadline_at: null,
      per_question_seconds: [30, 40],
      answers: [
        { choice: "A", correctChoice: "B", other: "", explanation: "", addToDrill: false },
        { choice: "C", correctChoice: "C", other: "", explanation: "", addToDrill: false },
      ],
      correct_flags: [false, true],
      guessed_flags: [false, false],
      mistake_tags: ["None", "None"],
      notes: null,
      score: { correct: 1, total: 2 },
      predicted_score: null,
      section_percentiles: null,
      pinned_insights: null,
      deleted_at: null,
      created_at: new Date(1_000).toISOString(),
      updated_at: new Date(2_000).toISOString(),
    } as PaperSessionRow;

    const before = aggregateMistakePool([paperRow]);
    expect(before).toHaveLength(1);
    expect(before[0].neverReviewed).toBe(true);
    expect(before[0].timesWrong).toBe(1);

    const mistakesRow = {
      ...paperRow,
      id: "s2",
      paper_id: null,
      paper_name: "OTHER",
      paper_variant: "Mistakes review",
      session_name: "[Mistakes] Unreviewed · 1 Qs",
      question_order: [1],
      selected_part_ids: ["id:42:1"],
      answers: [
        {
          choice: "B",
          correctChoice: "B",
          other: JSON.stringify({
            key: "id:42:1",
            paperId: 42,
            paperName: "NSAA",
            paperVariant: "2023 Section 1",
            questionNumber: 1,
            examName: "NSAA",
          }),
          explanation: "",
          addToDrill: false,
        },
      ],
      correct_flags: [true],
      ended_at: new Date(3_000).toISOString(),
    } as PaperSessionRow;

    const after = aggregateMistakePool([paperRow, mistakesRow]);
    expect(after).toHaveLength(1);
    expect(after[0].neverReviewed).toBe(false);
    expect(after[0].timesSeenInMistakes).toBe(1);
    expect(after[0].lastMistakesOutcome).toBe("correct");
  });

  it("excludes exams outside ENGAA NSAA TMUA", () => {
    const paperRow = {
      id: "s1",
      user_id: "u1",
      paper_id: 42,
      paper_name: "ESAT",
      paper_variant: "2024",
      session_name: "Practice",
      question_start: 1,
      question_end: 1,
      selected_sections: [],
      selected_part_ids: [],
      question_order: [1],
      time_limit_minutes: 40,
      started_at: new Date(1_000).toISOString(),
      ended_at: new Date(2_000).toISOString(),
      deadline_at: null,
      per_question_seconds: [30],
      answers: [
        { choice: "A", correctChoice: "B", other: "", explanation: "", addToDrill: false },
      ],
      correct_flags: [false],
      guessed_flags: [false],
      mistake_tags: ["None"],
      notes: null,
      score: { correct: 0, total: 1 },
      predicted_score: null,
      section_percentiles: null,
      pinned_insights: null,
      deleted_at: null,
      created_at: new Date(1_000).toISOString(),
      updated_at: new Date(2_000).toISOString(),
    } as PaperSessionRow;

    expect(aggregateMistakePool([paperRow])).toHaveLength(0);
  });
});
