/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFreeTierLaunch,
  readFreeTierSubjectFromSearch,
  resolveFreeTierLaunch,
  writeFreeTierLaunch,
} from "./freeTierLaunch";

function stubStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
}

describe("freeTierLaunch subject routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads startSubject from the practice URL", () => {
    expect(readFreeTierSubjectFromSearch("?startSubject=Physics")).toBe(
      "Physics",
    );
    expect(readFreeTierSubjectFromSearch("startSubject=Math%202")).toBe(
      "Math 2",
    );
    expect(readFreeTierSubjectFromSearch("?startSubject=Nope")).toBeNull();
  });

  it("prefers sessionStorage launch over query subject", () => {
    stubStorage();
    writeFreeTierLaunch("Chemistry");
    expect(resolveFreeTierLaunch("?startSubject=Physics")).toEqual({
      subject: "Chemistry",
    });
    clearFreeTierLaunch();
    expect(resolveFreeTierLaunch("?startSubject=Physics")).toEqual({
      subject: "Physics",
    });
  });
});
