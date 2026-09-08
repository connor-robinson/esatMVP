import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearHubFirstSectionPreview,
  firstSubjectPartsForHubStart,
  hasHubFirstSectionPreview,
  rememberHubFirstSectionPreview,
} from "./hubFirstSectionPreview";

describe("firstSubjectPartsForHubStart", () => {
  it("keeps only the first subject part", () => {
    expect(
      firstSubjectPartsForHubStart(["Mathematics", "Physics", "Chemistry"]),
    ).toEqual(["Mathematics"]);
  });

  it("returns an empty list when there are no parts", () => {
    expect(firstSubjectPartsForHubStart([])).toEqual([]);
  });
});

describe("hub first-section preview flag", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it("remembers and clears a session id", () => {
    rememberHubFirstSectionPreview("session-1");
    expect(hasHubFirstSectionPreview("session-1")).toBe(true);
    expect(hasHubFirstSectionPreview("session-2")).toBe(false);
    clearHubFirstSectionPreview();
    expect(hasHubFirstSectionPreview("session-1")).toBe(false);
  });
});
