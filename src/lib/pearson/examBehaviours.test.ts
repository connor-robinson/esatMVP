import { describe, expect, it } from "vitest";
import type { Question } from "@/types/papers";
import {
  emptyAnswerMap,
  emptyFlagMap,
  getQuestionNavStatus,
  listFlaggedAndUnanswered,
  needsUnseenContentWarning,
  persistColourScheme,
  resolveStrictShortcut,
  setAnswer,
  simulateTwoModulesNoCarry,
  toggleFlag,
  verifiedShortcutIdsOnly,
} from "./examBehaviours";
import { matchVerifiedShortcut } from "./shortcuts";
import { MODULE_DURATION_MS } from "./types";

function q(id: number, questionNumber: number): Question {
  return {
    id,
    paperId: 1,
    examName: "ESAT",
    examYear: 2024,
    paperName: "Mathematics 1",
    partLetter: "A",
    partName: "Maths 1",
    examType: "Official",
    questionNumber,
    questionImage: "/x.png",
    answerLetter: "A",
    solutionType: "none",
    createdAt: "",
    updatedAt: "",
  };
}

describe("pearson exam behaviours", () => {
  const questions = [q(10, 1), q(11, 2), q(12, 3)];

  it("persists answers until completed lock", () => {
    let answers = emptyAnswerMap(questions);
    answers = setAnswer(answers, 10, "B", false);
    expect(answers[10]).toBe("B");
    answers = setAnswer(answers, 10, "C", true);
    expect(answers[10]).toBe("B");
  });

  it("toggles flags until completed lock", () => {
    let flagged = emptyFlagMap(questions);
    flagged = toggleFlag(flagged, 11, false);
    expect(flagged[11]).toBe(true);
    flagged = toggleFlag(flagged, 11, false);
    expect(flagged[11]).toBe(false);
    flagged = toggleFlag(flagged, 11, true);
    expect(flagged[11]).toBe(false);
  });

  it("gates unseen content until viewed to end", () => {
    expect(needsUnseenContentWarning(10, { 10: false })).toBe(true);
    expect(needsUnseenContentWarning(10, { 10: true })).toBe(false);
  });

  it("reports navigator status complete/incomplete/unseen", () => {
    const answers = { 10: "A" as const, 11: null, 12: null };
    const visited = { 10: true, 11: true, 12: false };
    expect(getQuestionNavStatus(10, answers, visited)).toBe("complete");
    expect(getQuestionNavStatus(11, answers, visited)).toBe("incomplete");
    expect(getQuestionNavStatus(12, answers, visited)).toBe("unseen");
  });

  it("lists flagged and unanswered for review screen", () => {
    const answers = { 10: "A" as const, 11: null, 12: null };
    const flagged = { 10: true, 11: false, 12: true };
    const { flagged: f, unanswered } = listFlaggedAndUnanswered(
      questions,
      answers,
      flagged,
    );
    expect(f.map((x) => x.id)).toEqual([10, 12]);
    expect(unanswered.map((x) => x.id)).toEqual([11, 12]);
  });

  it("unused time does not carry between two modules", () => {
    const result = simulateTwoModulesNoCarry(
      0,
      10 * 60 * 1000,
      MODULE_DURATION_MS,
      10 * 60 * 1000,
      MODULE_DURATION_MS,
    );
    expect(result.module1UnusedMs).toBe(30 * 60 * 1000);
    expect(result.module2DurationMs).toBe(MODULE_DURATION_MS);
    expect(result.carried).toBe(false);
  });

  it("colour scheme persist helper returns the next scheme", () => {
    expect(
      persistColourScheme("standard", "black-on-light-yellow"),
    ).toBe("black-on-light-yellow");
  });

  it("only verified shortcuts match; unverified chords are ignored", () => {
    expect(
      matchVerifiedShortcut({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        key: "n",
        code: "KeyN",
      }),
    ).toBe("next");
    expect(
      matchVerifiedShortcut({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        key: "f",
        code: "KeyF",
      }),
    ).toBe("flag");
    expect(
      matchVerifiedShortcut({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        key: "e",
        code: "KeyE",
      }),
    ).toBe("end-exam");
    expect(
      matchVerifiedShortcut(
        {
          altKey: true,
          ctrlKey: false,
          metaKey: false,
          key: "n",
          code: "KeyN",
        },
        { endExamDialogOpen: true },
      ),
    ).toBe("no");
    expect(
      matchVerifiedShortcut({
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        key: "+",
        code: "Equal",
      }),
    ).toBe("zoom-in");
    expect(
      matchVerifiedShortcut({
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        key: "-",
        code: "Minus",
      }),
    ).toBe("zoom-out");
    expect(
      matchVerifiedShortcut({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        key: "p",
        code: "KeyP",
      }),
    ).toBeNull();
    expect(verifiedShortcutIdsOnly()).toEqual([
      "next",
      "flag",
      "end-exam",
      "close",
      "yes",
      "no",
      "zoom-in",
      "zoom-out",
    ]);
    expect(
      resolveStrictShortcut("strict-simulation", {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        key: "n",
        code: "KeyN",
      }),
    ).toBe("next");
  });
});
