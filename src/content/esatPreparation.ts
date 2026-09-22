/**
 * Editorial data for the /esat-preparation 21-day guide.
 * Aggregate stats only. No participant counts or identifiable data.
 */

export type CondensedRoadmapRow = {
  material: string;
  recommendation: string;
};

/**
 * Condensed past-paper recommendations aligned with the full guide roadmap.
 * Keep wording in sync with `TIER_LIST` / `buildPaperRoute` intent.
 */
export const CONDENSED_PAST_PAPER_ROADMAP: readonly CondensedRoadmapRow[] = [
  {
    material: "NSAA Section 1, 2016–2023",
    recommendation:
      "Do it. Strong Maths 1 and science practice.",
  },
  {
    material: "ENGAA Section 1 Part A",
    recommendation:
      "Skip duplicated Maths/Physics questions if you already completed the corresponding NSAA paper.",
  },
  {
    material: "ENGAA Section 1 Part B, 2020–2023",
    recommendation: "Do it if you take Maths 2.",
  },
  {
    material: "ENGAA Part B, 2016–2019",
    recommendation:
      "Use the unique questions only if you already completed the overlapping NSAA material.",
  },
  {
    material: "NSAA Section 2, 2020–2023",
    recommendation:
      "Useful harder science practice. Ignore material clearly outside the present specification.",
  },
  {
    material: "ENGAA Section 2",
    recommendation:
      "Avoid repeated questions if the equivalent NSAA set has already been completed.",
  },
  {
    material: "TMUA Paper 1",
    recommendation:
      "Useful additional Maths 2 practice after the closer ESAT material is exhausted.",
  },
] as const;

export const CALIBRATION_AGGREGATES = {
  meanScoreLabel: "8/15",
  medianEstimatedEsat: "5.0",
  medianProjectedRaw: "13.2/27",
} as const;

/** Relative share of calibration scores by bucket (sums to 100). */
export const CALIBRATION_SCORE_DISTRIBUTION: readonly {
  label: string;
  percent: number;
}[] = [
  { label: "0–3", percent: 7 },
  { label: "4–6", percent: 24 },
  { label: "7–9", percent: 41 },
  { label: "10–12", percent: 21 },
  { label: "13–15", percent: 7 },
] as const;

export const PACING_ACCURACY_BY_TIME: readonly {
  label: string;
  accuracyPercent: number;
}[] = [
  { label: "<45 sec", accuracyPercent: 44 },
  { label: "45–90 sec", accuracyPercent: 58.7 },
  { label: "90–120 sec", accuracyPercent: 49 },
  { label: ">120 sec", accuracyPercent: 45 },
] as const;

export const PACING_AGGREGATES = {
  medianFirstAttemptSeconds: 84.6,
  peakAccuracyPercent: 58.7,
  peakBucketLabel: "45–90 seconds",
} as const;

export const TOPIC_FIRST_ATTEMPT_ACCURACY: readonly {
  topic: string;
  accuracyPercent: number;
}[] = [
  { topic: "Waves", accuracyPercent: 31.5 },
  { topic: "Units", accuracyPercent: 32.5 },
  { topic: "Thermal physics", accuracyPercent: 35.0 },
  { topic: "Sequences and series", accuracyPercent: 41.2 },
  { topic: "Probability", accuracyPercent: 42.6 },
  { topic: "Mechanics", accuracyPercent: 43.3 },
  { topic: "Trigonometry", accuracyPercent: 45.7 },
  { topic: "Electricity", accuracyPercent: 46.4 },
] as const;

export const OVERALL_FIRST_ATTEMPT_ACCURACY = 47.6;

export type TimelinePhase = {
  id: string;
  when: string;
  title: string;
  items: readonly string[];
};

export const TWENTY_ONE_DAY_TIMELINE: readonly TimelinePhase[] = [
  {
    id: "diagnose",
    when: "Days 21–18",
    title: "Diagnose",
    items: [
      "Calibration",
      "Identify weaknesses",
      "Begin strongest past-paper material",
    ],
  },
  {
    id: "past-papers",
    when: "Days 17–14",
    title: "Past papers",
    items: [
      "Continue NSAA/ENGAA",
      "Avoid duplicates",
      "Review every mistake",
    ],
  },
  {
    id: "mocks",
    when: "Days 13–10",
    title: "Mocks",
    items: [
      "Begin full ESAT-format mocks",
      "Start mistake/Anki deck",
    ],
  },
  {
    id: "repair",
    when: "Days 9–7",
    title: "Repair",
    items: ["Weakest topics", "Mental maths", "Short timed sets"],
  },
  {
    id: "simulate",
    when: "Days 6–4",
    title: "Simulate",
    items: [
      "More complete mocks",
      "Practise full sitting where possible",
    ],
  },
  {
    id: "consolidate",
    when: "Days 3–2",
    title: "Consolidate",
    items: [
      "Recurring mistakes",
      "Anki",
      "Lighter targeted practice",
    ],
  },
  {
    id: "day-before",
    when: "Day 1",
    title: "Stop being clever",
    items: ["Light review only", "Check test logistics", "Sleep"],
  },
  {
    id: "test-day",
    when: "Test day",
    title: "Attempt everything",
    items: [
      "No negative marking",
      "Move on when stuck",
      "Come back where possible",
    ],
  },
] as const;

export const PREP_PIPELINE_STEPS = [
  "Calibration",
  "Past papers",
  "Full mocks",
  "Targeted practice",
  "Review",
] as const;

export type PrepResource = {
  id: string;
  title: string;
  body: string;
  href: string;
  placement: string;
};
