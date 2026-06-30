import { describe, expect, it } from "vitest";
import {
  nearestStandardAngle,
  normalizeDegrees,
  circularDistanceDeg,
  getAngleByDegrees,
} from "./angleData";
import { parseRadianInput } from "./parseRadianInput";
import { simplifyRadianFraction } from "./simplifyRadian";
import {
  compareDegreeAnswer,
  compareRadianAnswer,
  parseDegreeInput,
} from "./compareAngleAnswers";
import { compareCoordAnswer } from "./compareCoordAnswers";

describe("angleData", () => {
  it("normalizes degrees to 0–359", () => {
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(-30)).toBe(330);
    expect(normalizeDegrees(390)).toBe(30);
  });

  it("finds nearest standard angle", () => {
    const result = nearestStandardAngle(133);
    expect(result.angle.degrees).toBe(135);
    expect(result.distance).toBeLessThanOrEqual(3);
  });

  it("handles wrap-around near 0°", () => {
    const result = nearestStandardAngle(358);
    expect(result.angle.degrees).toBe(0);
    expect(circularDistanceDeg(358, 0)).toBe(2);
  });

  it("builds coordinates for 30°", () => {
    const angle = getAngleByDegrees(30);
    expect(angle?.cosLabel).toBe("sqrt(3)/2");
    expect(angle?.sinLabel).toBe("1/2");
  });
});

describe("compareCoordAnswers", () => {
  it("accepts sqrt variants", () => {
    const angle = getAngleByDegrees(45)!;
    expect(compareCoordAnswer("sqrt(2)/2", angle.cosLabel)).toBe(true);
  });
});

describe("parseRadianInput", () => {
  it("parses pi/6", () => {
    const parsed = parseRadianInput("pi/6");
    expect(parsed?.coeff).toBeCloseTo(1 / 6);
    expect(parsed?.label).toBe("π/6");
  });

  it("parses 3pi/4", () => {
    const parsed = parseRadianInput("3pi/4");
    expect(parsed?.label).toBe("3π/4");
  });

  it("parses 5*pi/3", () => {
    const parsed = parseRadianInput("5*pi/3");
    expect(parsed?.label).toBe("5π/3");
  });

  it("accepts equivalent unsimplified fraction 6π/8", () => {
    const parsed = parseRadianInput("6pi/8");
    expect(parsed?.label).toBe("3π/4");
  });

  it("parses 2π", () => {
    const parsed = parseRadianInput("2π");
    expect(parsed?.coeff).toBe(2);
    expect(parsed?.label).toBe("2π");
  });
});

describe("simplifyRadian", () => {
  it("reduces 6/8 to 3/4", () => {
    const s = simplifyRadianFraction(6, 8);
    expect(s.numerator).toBe(3);
    expect(s.denominator).toBe(4);
    expect(s.label).toBe("3π/4");
  });
});

describe("compareAngleAnswers", () => {
  const angle135 = getAngleByDegrees(135)!;

  it("compares degree integers", () => {
    expect(compareDegreeAnswer("135", angle135)).toBe(true);
    expect(compareDegreeAnswer("135°", angle135)).toBe(true);
    expect(compareDegreeAnswer("136", angle135)).toBe(false);
    expect(compareDegreeAnswer("360", angle135)).toBe(false);
  });

  it("parses degree input", () => {
    expect(parseDegreeInput("90")).toBe(90);
    expect(parseDegreeInput("360")).toBeNull();
  });

  it("compares radian equivalents", () => {
    expect(compareRadianAnswer("3pi/4", angle135)).toBe(true);
    expect(compareRadianAnswer("6π/8", angle135)).toBe(true);
    expect(compareRadianAnswer("π/2", angle135)).toBe(false);
  });
});
