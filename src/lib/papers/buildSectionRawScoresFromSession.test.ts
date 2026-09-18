import { describe, expect, it } from "vitest";
import { buildSectionRawScoresFromSession } from "@/lib/papers/buildSectionRawScoresFromSession";

describe("buildSectionRawScoresFromSession", () => {
  it("tallies correct/total per section from flags", () => {
    const scores = buildSectionRawScoresFromSession(
      {
        id: "s1",
        ended_at: "2026-01-01",
        answers: [{}, {}, {}, {}],
        correct_flags: [true, true, false, true],
        question_start: 1,
        question_end: 4,
      },
      [
        {
          question_number: 1,
          answer_letter: "A",
          part_name: "Mathematics 1",
          exam_name: "ESAT",
        },
        {
          question_number: 2,
          answer_letter: "B",
          part_name: "Mathematics 1",
          exam_name: "ESAT",
        },
        {
          question_number: 3,
          answer_letter: "C",
          part_name: "Physics",
          exam_name: "ESAT",
        },
        {
          question_number: 4,
          answer_letter: "D",
          part_name: "Physics",
          exam_name: "ESAT",
        },
      ],
    );

    expect(scores).toEqual([
      { section: "Mathematics 1", correct: 2, total: 2 },
      { section: "Physics", correct: 1, total: 2 },
    ]);
  });
});
