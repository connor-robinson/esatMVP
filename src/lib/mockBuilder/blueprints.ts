/**
 * Default mock blueprints per ESAT subject.
 * Targets are soft; the selector scores proximity rather than forcing exact counts.
 */

import type {
  MockBlueprintConfig,
  MockBuilderSubject,
  TopicTarget,
} from "./types";

const BASE_DIFFICULTY = [
  { difficulty: 1 as const, min: 2, max: 3, ideal: 2 },
  { difficulty: 2 as const, min: 4, max: 5, ideal: 5 },
  { difficulty: 3 as const, min: 9, max: 11, ideal: 10 },
  { difficulty: 4 as const, min: 6, max: 8, ideal: 7 },
  { difficulty: 5 as const, min: 1, max: 3, ideal: 3 },
];

/** Soft uniform-ish topic caps from syllabus topic lists. */
function topicTargetsFromCodes(
  codes: string[],
  softMax = 6,
  softMin = 1,
): TopicTarget[] {
  return codes.map((topicCode) => ({
    topicCode,
    min: softMin,
    max: softMax,
  }));
}

const MATH1_TOPICS = ["M1", "M2", "M3", "M4", "M5", "M6", "M7"];
const MATH2_TOPICS = ["MM1", "MM2", "MM3", "MM4", "MM5", "MM6", "MM7"];
const PHYSICS_TOPICS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const CHEMISTRY_TOPICS = [
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "C8",
  "C9",
  "C10",
  "C11",
  "C12",
  "C13",
  "C14",
  "C15",
  "C16",
  "C17",
];
const BIOLOGY_TOPICS = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "B8",
  "B9",
  "B10",
  "B11",
];

function baseBlueprint(
  topicCodes: string[],
  presentationExtra: MockBlueprintConfig["presentationTargets"],
): MockBlueprintConfig {
  return {
    questionCount: 27,
    timeLimitMinutes: 40,
    // Strong candidate under intentional time pressure (~35–42 min of work).
    estimatedTimingSeconds: { min: 2100, max: 2700, ideal: 2400 },
    difficultyDistribution: BASE_DIFFICULTY,
    topicTargets: topicTargetsFromCodes(topicCodes),
    presentationTargets: [
      { type: "text", min: 12, max: 24 },
      ...presentationExtra,
    ],
    maxRepeatedReasoningType: 5,
    maxPerTopicSoft: 6,
    answerDistributionTolerance: {
      maxDeviationFromUniform: 3,
      hardMaxPerLetter: 10,
    },
    optionLetters: ["A", "B", "C", "D", "E"],
  };
}

export const DEFAULT_BLUEPRINTS: Record<MockBuilderSubject, MockBlueprintConfig> =
  {
    "Math 1": baseBlueprint(MATH1_TOPICS, [
      { type: "diagram", min: 2, max: 8 },
      { type: "graph", min: 0, max: 4 },
      { type: "table", min: 0, max: 3 },
    ]),
    "Math 2": baseBlueprint(MATH2_TOPICS, [
      { type: "diagram", min: 1, max: 6 },
      { type: "graph", min: 2, max: 8 },
      { type: "table", min: 0, max: 2 },
    ]),
    Physics: baseBlueprint(PHYSICS_TOPICS, [
      { type: "diagram", min: 3, max: 10 },
      { type: "graph", min: 1, max: 6 },
      { type: "table", min: 0, max: 4 },
    ]),
    Chemistry: baseBlueprint(CHEMISTRY_TOPICS, [
      { type: "diagram", min: 1, max: 6 },
      { type: "graph", min: 0, max: 4 },
      { type: "table", min: 1, max: 5 },
    ]),
    Biology: baseBlueprint(BIOLOGY_TOPICS, [
      { type: "diagram", min: 2, max: 8 },
      { type: "graph", min: 0, max: 4 },
      { type: "table", min: 1, max: 5 },
    ]),
  };

export function getDefaultBlueprint(
  subject: MockBuilderSubject,
): MockBlueprintConfig {
  return structuredClone(DEFAULT_BLUEPRINTS[subject]);
}

export function mergeBlueprintConfig(
  base: MockBlueprintConfig,
  override: Partial<MockBlueprintConfig> | null | undefined,
): MockBlueprintConfig {
  if (!override) return structuredClone(base);
  return {
    ...structuredClone(base),
    ...override,
    difficultyDistribution:
      override.difficultyDistribution ?? base.difficultyDistribution,
    topicTargets: override.topicTargets ?? base.topicTargets,
    presentationTargets:
      override.presentationTargets ?? base.presentationTargets,
    estimatedTimingSeconds:
      override.estimatedTimingSeconds ?? base.estimatedTimingSeconds,
    answerDistributionTolerance:
      override.answerDistributionTolerance ??
      base.answerDistributionTolerance,
    optionLetters: override.optionLetters ?? base.optionLetters,
  };
}

/** Initial product plan: mock 1 free, mocks 2–6 paid. */
export function isFreeMockNumber(mockNumber: number): boolean {
  return mockNumber === 1;
}

export function defaultMockTitle(
  subject: MockBuilderSubject,
  mockNumber: number,
): string {
  return `${subject} - Mock ${mockNumber}`;
}
