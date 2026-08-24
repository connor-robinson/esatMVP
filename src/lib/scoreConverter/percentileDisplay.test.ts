import { describe, expect, it } from "vitest";
import {
  formatOrdinal,
  formatPercentileDisplay,
} from "@/lib/esat/percentileWording";

describe("converter percentile formatting", () => {
  it("formats whole-number ordinals without decimal suffixes", () => {
    expect(formatOrdinal(60.3)).toBe("60th");
    expect(formatOrdinal(61.7)).toBe("62nd");
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(23)).toBe("23rd");
  });

  it("renders converter labels as whole-number percentiles", () => {
    expect(formatPercentileDisplay(60.3)).toBe("60th percentile");
    expect(formatPercentileDisplay(61.7)).toBe("62nd percentile");
    expect(formatPercentileDisplay(null)).toBeNull();
    expect(formatPercentileDisplay(Number.NaN)).toBeNull();
  });
});
