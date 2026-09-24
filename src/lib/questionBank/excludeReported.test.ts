import { describe, expect, it } from "vitest";
import {
  omitReportedQuestions,
  questionIdsFromReportRows,
} from "./excludeReported";

describe("questionIdsFromReportRows", () => {
  it("keeps uuid question ids from open report context", () => {
    const ids = questionIdsFromReportRows([
      {
        context: {
          questionId: "11111111-1111-4111-8111-111111111111",
        },
      },
      {
        context: JSON.stringify({
          questionId: "22222222-2222-4222-8222-222222222222",
        }),
      },
    ]);
    expect([...ids].sort()).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("ignores past-paper numeric ids and empty context", () => {
    const ids = questionIdsFromReportRows([
      { context: { questionId: "2116" } },
      { context: {} },
      { context: "not-json" },
    ]);
    expect(ids.size).toBe(0);
  });
});

describe("omitReportedQuestions", () => {
  it("drops reported rows and leaves the rest", () => {
    const reported = new Set(["b"]);
    expect(
      omitReportedQuestions(
        [
          { id: "a", stem: "keep" },
          { id: "b", stem: "hide" },
        ],
        reported,
      ),
    ).toEqual([{ id: "a", stem: "keep" }]);
  });
});
