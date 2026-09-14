import { describe, expect, it } from "vitest";
import {
  MAX_REST_BREAKS_PER_SECTION,
  canStartRestBreak,
  extendDeadlineByPause,
  restBreaksRemaining,
} from "@/lib/papers/restBreaks";

describe("restBreaksRemaining", () => {
  it("caps at the UAT-UK per-section limit", () => {
    expect(MAX_REST_BREAKS_PER_SECTION).toBe(3);
    expect(restBreaksRemaining(0)).toBe(3);
    expect(restBreaksRemaining(2)).toBe(1);
    expect(restBreaksRemaining(3)).toBe(0);
    expect(restBreaksRemaining(9)).toBe(0);
  });
});

describe("canStartRestBreak", () => {
  it("requires enabled, inactive, and remaining breaks", () => {
    expect(
      canStartRestBreak({ enabled: false, used: 0, alreadyActive: false }),
    ).toBe(false);
    expect(
      canStartRestBreak({ enabled: true, used: 0, alreadyActive: true }),
    ).toBe(false);
    expect(
      canStartRestBreak({ enabled: true, used: 3, alreadyActive: false }),
    ).toBe(false);
    expect(
      canStartRestBreak({ enabled: true, used: 1, alreadyActive: false }),
    ).toBe(true);
  });
});

describe("extendDeadlineByPause", () => {
  it("adds pause duration to the deadline", () => {
    expect(extendDeadlineByPause(1_000_000, 900_000, 950_000)).toBe(1_050_000);
  });

  it("ignores null deadlines and negative pauses", () => {
    expect(extendDeadlineByPause(null, 100, 200)).toBe(null);
    expect(extendDeadlineByPause(1_000, 200, 100)).toBe(1_000);
  });
});
