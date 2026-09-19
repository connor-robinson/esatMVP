import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  clearPaperResumeAfterAuth,
  isPreservingPaperForAuth,
  peekPaperResumeAfterAuth,
  rememberPaperResumeAfterAuth,
} from "./resumeAfterAuth";
import { isPastPaperSolveRedirect } from "@/lib/onboarding/redirect";

function installSessionStorageMock() {
  const map = new Map<string, string>();
  const mock = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
  };
  Object.defineProperty(globalThis, "sessionStorage", {
    value: mock,
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    configurable: true,
  });
}

describe("resumeAfterAuth storage", () => {
  beforeEach(() => {
    installSessionStorageMock();
    clearPaperResumeAfterAuth();
  });

  afterEach(() => {
    clearPaperResumeAfterAuth();
  });

  it("round-trips the resume payload", () => {
    rememberPaperResumeAfterAuth({
      sessionId: "abc",
      sectionIndex: 0,
      questionIndex: 3,
      remainingSec: 1200,
    });
    expect(isPreservingPaperForAuth()).toBe(true);
    expect(peekPaperResumeAfterAuth()).toEqual({
      sessionId: "abc",
      sectionIndex: 0,
      questionIndex: 3,
      remainingSec: 1200,
    });
    clearPaperResumeAfterAuth();
    expect(isPreservingPaperForAuth()).toBe(false);
  });
});

describe("isPastPaperSolveRedirect", () => {
  it("matches solve paths", () => {
    expect(isPastPaperSolveRedirect("/past-papers/solve")).toBe(true);
    expect(isPastPaperSolveRedirect("/past-papers/solve?x=1")).toBe(true);
    expect(isPastPaperSolveRedirect("/past-papers/mark")).toBe(false);
  });
});
