import { describe, expect, it } from "vitest";
import {
  CAMERA_CURVE_FUNCTIONS,
  CORRECT_CAMERA_CURVE,
  mapCameraX,
  mapCameraY,
  pointsToPath,
  sampleCurve,
} from "./cameraDistanceCurves";

describe("cameraDistanceCurves", () => {
  it("starts A, B and C at the same normalized height", () => {
    expect(CAMERA_CURVE_FUNCTIONS.A(0)).toBe(1);
    expect(CAMERA_CURVE_FUNCTIONS.B(0)).toBe(1);
    expect(CAMERA_CURVE_FUNCTIONS.C(0)).toBe(1);
  });

  it("keeps A positive and decreasing like 1/d", () => {
    const samples = sampleCurve(CAMERA_CURVE_FUNCTIONS.A, 50).map((p) => p.y);
    expect(samples.every((y) => y > 0)).toBe(true);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]!);
    }
    expect(CAMERA_CURVE_FUNCTIONS.A(1)).toBeCloseTo(0.2, 5);
  });

  it("makes C decay faster than A early on", () => {
    const u = 0.35;
    expect(CAMERA_CURVE_FUNCTIONS.C(u)).toBeLessThan(
      CAMERA_CURVE_FUNCTIONS.A(u),
    );
  });

  it("makes D increase concave-up from a low start", () => {
    expect(CAMERA_CURVE_FUNCTIONS.D(0)).toBeCloseTo(0.08, 5);
    expect(CAMERA_CURVE_FUNCTIONS.D(1)).toBeGreaterThan(
      CAMERA_CURVE_FUNCTIONS.D(0.5),
    );
  });

  it("maps coordinates inside the viewBox and builds a path", () => {
    expect(mapCameraX(0)).toBeGreaterThan(0);
    expect(mapCameraX(1)).toBeLessThan(620);
    expect(mapCameraY(0)).toBeGreaterThan(mapCameraY(1));
    const path = pointsToPath(sampleCurve(CAMERA_CURVE_FUNCTIONS.B, 4));
    expect(path.startsWith("M ")).toBe(true);
    expect(path.includes("L ")).toBe(true);
  });

  it("marks A as the correct curve", () => {
    expect(CORRECT_CAMERA_CURVE).toBe("A");
  });
});
