import { describe, expect, it } from "vitest";
import {
  applyExtraTimeMinutes,
  type ExtraTimePrefs,
} from "@/lib/papers/extraTime";

describe("applyExtraTimeMinutes", () => {
  it("returns base when disabled or zero percent", () => {
    expect(applyExtraTimeMinutes(40, { enabled: false, percentage: 25 })).toBe(
      40,
    );
    expect(applyExtraTimeMinutes(40, { enabled: true, percentage: 0 })).toBe(40);
    expect(applyExtraTimeMinutes(40, 0)).toBe(40);
  });

  it("applies +25% with ceil", () => {
    expect(applyExtraTimeMinutes(40, { enabled: true, percentage: 25 })).toBe(
      50,
    );
    expect(applyExtraTimeMinutes(75, 25)).toBe(94);
  });

  it("accepts a bare percentage number", () => {
    const prefs: ExtraTimePrefs = { enabled: true, percentage: 25 };
    expect(applyExtraTimeMinutes(40, prefs.percentage)).toBe(50);
  });
});
