import { describe, expect, it } from "vitest";
import {
  allocateDifficultyCounts,
  sampleQuestionsByDifficultyMix,
  type ApiDifficulty,
} from "@/lib/questionBank/difficultyMix";

describe("difficulty mix sampling", () => {
  it("allocates even Auto counts", () => {
    expect(allocateDifficultyCounts(30, "Auto")).toEqual({
      Easy: 10,
      Medium: 10,
      Hard: 10,
    });
  });

  it("biases Easy toward easier questions", () => {
    const counts = allocateDifficultyCounts(20, "Easy");
    expect(counts.Easy).toBeGreaterThan(counts.Medium);
    expect(counts.Medium).toBeGreaterThan(counts.Hard);
    expect(counts.Easy + counts.Medium + counts.Hard).toBe(20);
  });

  it("biases Hard toward harder questions", () => {
    const counts = allocateDifficultyCounts(20, "Hard");
    expect(counts.Hard).toBeGreaterThan(counts.Medium);
    expect(counts.Medium).toBeGreaterThanOrEqual(counts.Easy);
    expect(counts.Easy + counts.Medium + counts.Hard).toBe(20);
  });

  it("samples a mixed set from a pool", () => {
    const pool = [
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `e${i}`,
        difficulty: "Easy" as ApiDifficulty,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `m${i}`,
        difficulty: "Medium" as ApiDifficulty,
      })),
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `h${i}`,
        difficulty: "Hard" as ApiDifficulty,
      })),
    ];
    const picked = sampleQuestionsByDifficultyMix(pool, 12, "Medium");
    expect(picked).toHaveLength(12);
    const tally = { Easy: 0, Medium: 0, Hard: 0 };
    for (const q of picked) tally[q.difficulty] += 1;
    expect(tally.Medium).toBeGreaterThanOrEqual(tally.Easy);
    expect(tally.Medium).toBeGreaterThanOrEqual(tally.Hard);
  });
});
