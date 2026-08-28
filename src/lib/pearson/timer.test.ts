import { describe, expect, it } from "vitest";
import {
  formatRemainingMs,
  isModuleTimeExpired,
  moduleDeadlineFromStart,
  remainingMs,
  startFreshModuleDeadline,
  unusedMsAtEnd,
} from "./timer";
import { MODULE_DURATION_MS } from "./types";

describe("pearson timer", () => {
  it("remainingMs never returns negative", () => {
    expect(remainingMs(1000, 5000)).toBe(0);
    expect(remainingMs(5000, 5000)).toBe(0);
    expect(remainingMs(8000, 5000)).toBe(3000);
  });

  it("formatRemainingMs formats MM:SS and clamps negatives", () => {
    expect(formatRemainingMs(0)).toBe("00:00");
    expect(formatRemainingMs(-5000)).toBe("00:00");
    expect(formatRemainingMs(65_000)).toBe("01:05");
    expect(formatRemainingMs(40 * 60 * 1000)).toBe("40:00");
    expect(formatRemainingMs(39 * 60 * 1000 + 59_000)).toBe("39:59");
  });

  it("moduleDeadlineFromStart uses 40 minutes by default", () => {
    const start = 1_000_000;
    expect(moduleDeadlineFromStart(start)).toBe(start + MODULE_DURATION_MS);
    expect(moduleDeadlineFromStart(start, 10_000)).toBe(start + 10_000);
  });

  it("isModuleTimeExpired is true at and after deadline", () => {
    expect(isModuleTimeExpired(1000, 1000)).toBe(true);
    expect(isModuleTimeExpired(1000, 1001)).toBe(true);
    expect(isModuleTimeExpired(1000, 999)).toBe(false);
  });

  it("unusedMsAtEnd reports leftover without going negative", () => {
    const deadline = startFreshModuleDeadline(0, 60_000);
    expect(unusedMsAtEnd(deadline, 10_000)).toBe(50_000);
    expect(unusedMsAtEnd(deadline, 90_000)).toBe(0);
  });

  it("timer expiry opens review without negative time", () => {
    const deadline = startFreshModuleDeadline(0, 60_000);
    expect(formatRemainingMs(remainingMs(deadline, 120_000))).toBe("00:00");
    expect(isModuleTimeExpired(deadline, 120_000)).toBe(true);
  });
});
