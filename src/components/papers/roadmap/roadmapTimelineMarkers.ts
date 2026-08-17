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
    text: "The first NSAA paper. Older format with a separate long answer Section 2. Section 1 is where most of the ESAT style practice lives: short, direct, and quite time pressured.",
  },
  "engaa-2016": {
    title: "ENGAA 2016",
    text: "The old 54 question ENGAA. Most of it repeats NSAA 2016, so do NSAA first. This stage only adds the questions that are genuinely new, plus Section 2 physics.",
  },
  "nsaa-2019": {
    title: "NSAA 2019",
    text: "A transition year. Still the older overall shape, but the questions feel closer to modern ESAT pace. Worth doing before ENGAA 2019.",
  },
  "engaa-2019": {
    title: "ENGAA 2019",
    text: "Big format change to 40 questions in Section 1. Still lots of overlap with NSAA 2019, so treat this as topping up rather than a full new paper.",
  },
  "nsaa-2020": {
    title: "NSAA 2020",
    text: "Section 2 goes multiple choice. From here NSAA is much closer to what ESAT feels like today. Section 1 is the main focus.",
  },
  "engaa-2020": {
    title: "ENGAA 2020",
    text: "First year of the shorter Section 1 format. All of Section 1 here is worth doing once you have done NSAA 2020. Section 2 repeats NSAA so we skip it.",
  },
  "engaa-2021": {
    title: "ENGAA 2021 to 2023",
    text: "The last ENGAA papers. Fast and calculation heavy. Section 1 only; good extra maths and physics once you have done NSAA for the same year.",
  },
  "nsaa-2023": {
    title: "End of roadmap",
    text: "ESAT replaces NSAA and ENGAA from 2024. More practice papers coming soon.",
  },
  "tmua-intro": {
    title: "TMUA",
    text: "Extra maths papers, mainly for Math 2. We default to Paper 1; add Paper 2 if you want more challenge.",
  },
};

export function getStageCommentary(stageId: string): StageCommentary | null {
  return STAGE_COMMENTARY[stageId] ?? null;
}

export function buildRoadmapTimelineMarkers(stages: RoadmapStage[]): TimelineMarker[] {
  const markers: TimelineMarker[] = [];
  let tmuaIntroAdded = false;

  stages.forEach((stage, index) => {
    if (stage.examName === "TMUA" && !tmuaIntroAdded) {
      const intro = STAGE_COMMENTARY["tmua-intro"];
      if (intro) {
        tmuaIntroAdded = true;
        markers.push({
          stageIndex: index,
          examName: stage.examName,
          title: intro.title,
          text: intro.text,
        });
      }
      return;
    }

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
