import { describe, expect, it } from "vitest";
import { shouldInferPreferenceFromProgress } from "./sessionUiPreference";

describe("shouldInferPreferenceFromProgress", () => {
  it("does not infer immediately on a long paper", () => {
    expect(shouldInferPreferenceFromProgress(3, 27)).toBe(false);
    expect(shouldInferPreferenceFromProgress(5, 27)).toBe(false);
    expect(shouldInferPreferenceFromProgress(13, 27)).toBe(false);
  });

  it("infers at halfway on a long paper (at least 5)", () => {
    expect(shouldInferPreferenceFromProgress(14, 27)).toBe(true);
    expect(shouldInferPreferenceFromProgress(5, 10)).toBe(true);
  });

  it("waits until the end on short papers", () => {
    expect(shouldInferPreferenceFromProgress(3, 5)).toBe(false);
    expect(shouldInferPreferenceFromProgress(5, 5)).toBe(true);
    expect(shouldInferPreferenceFromProgress(5, 6)).toBe(false);
    expect(shouldInferPreferenceFromProgress(6, 6)).toBe(true);
  });
});
