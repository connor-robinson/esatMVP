import { describe, expect, it } from "vitest";
import {
  appendStatementItemsToStem,
  getQuestionStatementItems,
} from "./statementItems";
import { questionBankQuestionsToPearson } from "./toPearsonQuestion";
import type { QuestionBankQuestion } from "@/types/questionBank";

describe("appendStatementItemsToStem", () => {
  it("appends numbered statements under the stem", () => {
    const result = appendStatementItemsToStem(
      "Which of the following statements is/are correct?",
      [
        { number: 1, textMarkdown: "Weight is unchanged." },
        { number: 2, textMarkdown: "Resultant force is upwards." },
      ],
    );
    expect(result).toBe(
      [
        "Which of the following statements is/are correct?",
        "",
        "1. Weight is unchanged.",
        "",
        "2. Resultant force is upwards.",
      ].join("\n"),
    );
  });

  it("returns the stem unchanged when there are no statements", () => {
    expect(appendStatementItemsToStem("Stem only.", null)).toBe("Stem only.");
    expect(appendStatementItemsToStem("Stem only.", [])).toBe("Stem only.");
  });
});

describe("questionBankQuestionsToPearson statement items", () => {
  it("folds idea_plan statement_items into questionStem", () => {
    const question = {
      id: "q1",
      question_stem:
        "A parachutist is falling vertically at terminal velocity. The parachute is then opened.\n\nWhich of the following statements is/are correct?",
      options: { A: "none of them", E: "1 and 2 only" },
      correct_option: "E",
      subjects: "Physics",
      test_type: "ESAT",
      idea_plan: {
        question_type: "multi_statement_single_choice",
        statement_items: [
          {
            number: 1,
            textMarkdown:
              "Immediately after the parachute opens, the parachutist's weight is unchanged.",
          },
          {
            number: 2,
            textMarkdown:
              "Immediately after the parachute opens, the resultant force on the parachutist is upwards.",
          },
          {
            number: 3,
            textMarkdown:
              "At the new, lower terminal velocity, the air resistance is less than the parachutist's weight.",
          },
        ],
      },
    } as QuestionBankQuestion;

    expect(getQuestionStatementItems(question)).toHaveLength(3);

    const [pearson] = questionBankQuestionsToPearson([question]);
    expect(pearson.questionStem).toContain("1. Immediately after the parachute opens");
    expect(pearson.questionStem).toContain("2. Immediately after the parachute opens");
    expect(pearson.questionStem).toContain("3. At the new, lower terminal velocity");
  });
});
