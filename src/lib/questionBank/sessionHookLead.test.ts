import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildSessionQuestionsWithHookLead,
  hookQuestionIdsForSubjects,
} from "@/lib/questionBank/sessionHookLead";
import { freeTierQuestionIdsForSubject } from "@/lib/questionBank/freeTierQuestions";
import type { ApiDifficulty } from "@/lib/questionBank/difficultyMix";

type Q = { id: string; difficulty: ApiDifficulty };

function makePool(prefix: string, n: number, difficulty: ApiDifficulty): Q[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    difficulty,
  }));
}

describe("hookQuestionIdsForSubjects", () => {
  it("returns Math 1 hook ids for Math 1", () => {
    const ids = hookQuestionIdsForSubjects(["Math 1"]);
    expect(ids).toEqual([...freeTierQuestionIdsForSubject("Math 1")]);
    expect(ids).toHaveLength(10);
  });

  it("ignores subjects without a hook set", () => {
    expect(hookQuestionIdsForSubjects(["TMUA Paper 1"])).toEqual([]);
  });

  it("unions hook ids across selected subjects", () => {
    const ids = hookQuestionIdsForSubjects(["Math 1", "Physics"]);
    expect(ids).toHaveLength(20);
    expect(ids).toEqual([
      ...freeTierQuestionIdsForSubject("Math 1"),
      ...freeTierQuestionIdsForSubject("Physics"),
    ]);
  });
});

describe("buildSessionQuestionsWithHookLead", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts shuffled hooks first, then fills from the pool", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const hooks: Q[] = [
      { id: "h0", difficulty: "Easy" },
      { id: "h1", difficulty: "Medium" },
      { id: "h2", difficulty: "Hard" },
      { id: "h3", difficulty: "Easy" },
      { id: "h4", difficulty: "Medium" },
      { id: "h5", difficulty: "Hard" },
      { id: "h6", difficulty: "Easy" },
      { id: "h7", difficulty: "Medium" },
      { id: "h8", difficulty: "Hard" },
      { id: "h9", difficulty: "Easy" },
    ];
    const pool = [
      ...hooks,
      ...makePool("e", 20, "Easy"),
      ...makePool("m", 20, "Medium"),
      ...makePool("k", 20, "Hard"),
    ];

    const session = buildSessionQuestionsWithHookLead({
      pool,
      hookQuestions: hooks,
      count: 30,
      mix: "Auto",
    });

    expect(session).toHaveLength(30);
    const hookIdSet = new Set(hooks.map((q) => q.id));
    expect(session.slice(0, 10).map((q) => q.id).sort()).toEqual(
      hooks.map((q) => q.id).sort(),
    );
    const tailIds = session.slice(10).map((q) => q.id);
    expect(tailIds.every((id) => !hookIdSet.has(id))).toBe(true);
  });

  it("uses only hooks when count is at most 10", () => {
    const hooks: Q[] = Array.from({ length: 10 }, (_, i) => ({
      id: `h${i}`,
      difficulty: "Medium" as ApiDifficulty,
    }));
    const session = buildSessionQuestionsWithHookLead({
      pool: [...hooks, ...makePool("x", 40, "Easy")],
      hookQuestions: hooks,
      count: 10,
      mix: "Auto",
    });
    expect(session).toHaveLength(10);
    expect(session.every((q) => q.id.startsWith("h"))).toBe(true);
  });

  it("takes a subset of hooks when count is below the hook set size", () => {
    const hooks: Q[] = Array.from({ length: 10 }, (_, i) => ({
      id: `h${i}`,
      difficulty: "Easy" as ApiDifficulty,
    }));
    const session = buildSessionQuestionsWithHookLead({
      pool: hooks,
      hookQuestions: hooks,
      count: 4,
      mix: "Auto",
    });
    expect(session).toHaveLength(4);
    expect(session.every((q) => q.id.startsWith("h"))).toBe(true);
  });

  it("falls back to mix sampling when no hooks are available", () => {
    const pool = [
      ...makePool("e", 10, "Easy"),
      ...makePool("m", 10, "Medium"),
      ...makePool("h", 10, "Hard"),
    ];
    const session = buildSessionQuestionsWithHookLead({
      pool,
      hookQuestions: [],
      count: 12,
      mix: "Auto",
    });
    expect(session).toHaveLength(12);
  });
});
