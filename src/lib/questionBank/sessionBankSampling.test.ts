import { describe, expect, it, vi, afterEach } from "vitest";
import {
  orderBankTailForSessionStart,
  questionHasDiagram,
  questionRecencyScore,
  sampleSessionBankQuestions,
  type BankSampleQuestion,
} from "./sessionBankSampling";
import type { ApiDifficulty } from "./difficultyMix";

function q(
  partial: Partial<BankSampleQuestion> & {
    id: string;
    difficulty: ApiDifficulty;
  },
): BankSampleQuestion {
  return {
    created_at: "2026-08-01T00:00:00.000Z",
    has_visual: false,
    ...partial,
  };
}

describe("questionHasDiagram", () => {
  it("detects has_visual, graph_specs, and inline svg", () => {
    expect(questionHasDiagram(q({ id: "a", difficulty: "Easy", has_visual: true }))).toBe(
      true,
    );
    expect(
      questionHasDiagram(
        q({ id: "b", difficulty: "Easy", graph_specs: { g1: { type: "x" } } }),
      ),
    ).toBe(true);
    expect(
      questionHasDiagram(
        q({
          id: "c",
          difficulty: "Easy",
          question_stem: '<p>See</p><svg viewBox="0 0 10 10"></svg>',
        }),
      ),
    ).toBe(true);
    expect(questionHasDiagram(q({ id: "d", difficulty: "Easy" }))).toBe(false);
  });
});

describe("questionRecencyScore", () => {
  it("scores newer questions higher", () => {
    const now = Date.parse("2026-09-10T00:00:00.000Z");
    const fresh = questionRecencyScore("2026-09-01T00:00:00.000Z", now);
    const old = questionRecencyScore("2025-01-01T00:00:00.000Z", now);
    expect(fresh).toBeGreaterThan(old);
    expect(old).toBeGreaterThan(0.1);
  });
});

describe("sampleSessionBankQuestions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not repeat ids and prefers diagrams early", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);

    const pool: BankSampleQuestion[] = [];
    for (let i = 0; i < 30; i += 1) {
      pool.push(
        q({
          id: `text-${i}`,
          difficulty: (["Easy", "Medium", "Hard"] as const)[i % 3]!,
          has_visual: false,
          created_at: "2025-06-01T00:00:00.000Z",
        }),
      );
      pool.push(
        q({
          id: `diag-${i}`,
          difficulty: (["Easy", "Medium", "Hard"] as const)[i % 3]!,
          has_visual: true,
          created_at: "2026-09-01T00:00:00.000Z",
        }),
      );
    }

    const picked = sampleSessionBankQuestions(pool, 12, "Auto");
    expect(picked).toHaveLength(12);
    expect(new Set(picked.map((row) => row.id)).size).toBe(12);

    const early = picked.slice(0, 6);
    const earlyDiagrams = early.filter(questionHasDiagram).length;
    expect(earlyDiagrams).toBeGreaterThanOrEqual(3);
  });
});

describe("orderBankTailForSessionStart", () => {
  it("front-loads diagram questions", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const items = [
      q({ id: "t1", difficulty: "Easy", has_visual: false }),
      q({ id: "d1", difficulty: "Easy", has_visual: true }),
      q({ id: "t2", difficulty: "Medium", has_visual: false }),
      q({ id: "d2", difficulty: "Medium", has_visual: true }),
    ];
    const ordered = orderBankTailForSessionStart(items);
    expect(questionHasDiagram(ordered[0]!)).toBe(true);
  });
});
