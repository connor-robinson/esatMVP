import { describe, expect, it } from "vitest";
import {
  isViewportContentFullyViewed,
  viewportRequiresScrolling,
} from "./viewportSeen";

describe("viewportSeen", () => {
  it("treats short content as fully viewed", () => {
    expect(isViewportContentFullyViewed(0, 400, 800)).toBe(true);
    expect(viewportRequiresScrolling(400, 800)).toBe(false);
  });

  it("requires scrolling near the bottom when content overflows", () => {
    expect(viewportRequiresScrolling(1200, 800)).toBe(true);
    expect(isViewportContentFullyViewed(0, 1200, 800)).toBe(false);
    expect(isViewportContentFullyViewed(392, 1200, 800)).toBe(true);
  });
});
