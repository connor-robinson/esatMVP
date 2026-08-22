import { describe, expect, it } from "vitest";
import { scaledScoreNearTarget } from "@/lib/scoreConverter/converterExample.server";

describe("converter example helpers", () => {
  it("picks the score closest to the target", () => {
    const rows = [
      { score: 3.8, cumulativePct: 40 },
      { score: 4.2, cumulativePct: 55 },
      { score: 5.0, cumulativePct: 70 },
    ];
    expect(scaledScoreNearTarget(rows, 4.1)).toBe(4.2);
  });
});
