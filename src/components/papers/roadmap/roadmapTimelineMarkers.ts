/**
 * Timeline tip placements and ESAT-focused guidance copy for the practice roadmap.
 * Only key transition years — concise, factual notes (visible to all users).
 */

import type { RoadmapStage } from "@/lib/papers/roadmapConfig";

export interface TimelineMarker {
  stageIndex: number;
  examName: string;
  title: string;
  text: string;
}

export interface StageCommentary {
  title: string;
  text: string;
}

/** Commentary keyed by roadmap stage id — important / transition papers only. */
const STAGE_COMMENTARY: Record<string, StageCommentary> = {
  "nsaa-2016": {
    title: "NSAA 2016",
    text: "First NSAA paper — older format with a separate long-answer Section 2. Section 1 is the main ESAT practice: direct, time-pressured, mostly short multi-step problems.",
  },
  "engaa-2016": {
    title: "ENGAA 2016",
    text: "Old 54-question ENGAA. Much repeats NSAA 2016 — do NSAA first, then only the extras. Extra Maths: Q47, Q49, Q51. Extra Physics: Q32, Q42, Q52, Q54.",
  },
  "nsaa-2019": {
    title: "NSAA 2019",
    text: "Transition year: still the older overall structure, but questions are closer to modern ESAT pace. Worth doing before ENGAA 2019.",
  },
  "engaa-2019": {
    title: "ENGAA 2019",
    text: "Major format change — 40-question Section 1 plus 20-question Section 2. Overlap with NSAA is still huge. After NSAA 2019, only three new Section 1 questions: Maths Q25, Q39; Physics Q38.",
  },
  "nsaa-2020": {
    title: "NSAA 2020",
    text: "Section 2 becomes multiple choice. From here NSAA is much closer to the modern ESAT layout. Best section for ESAT: Section 1.",
  },
  "engaa-2020": {
    title: "ENGAA 2020",
    text: "New ENGAA format is established: 40-question Section 1 + 20-question Section 2. Overlap with NSAA is less straightforward — use mainly as extra Maths 2 and Physics.",
  },
  "engaa-2021": {
    title: "ENGAA 2021–2023",
    text: "Final ENGAA generation — fast, compact, calculation-heavy. Strong Maths 2 and Physics practice; some questions sit outside the current ESAT spec. Prioritise parts that match your modules.",
  },
  "nsaa-2023": {
    title: "2024 onwards",
    text: "ESAT replaces NSAA and ENGAA: same broad skills, but split into 40-minute modules and entirely multiple choice.",
  },
};

export function getStageCommentary(stageId: string): StageCommentary | null {
  return STAGE_COMMENTARY[stageId] ?? null;
}

export function buildRoadmapTimelineMarkers(stages: RoadmapStage[]): TimelineMarker[] {
  const markers: TimelineMarker[] = [];

  stages.forEach((stage, index) => {
    const copy = STAGE_COMMENTARY[stage.id];
    if (!copy) return;

    markers.push({
      stageIndex: index,
      examName: stage.examName,
      title: copy.title,
      text: copy.text,
    });
  });

  return markers;
}
