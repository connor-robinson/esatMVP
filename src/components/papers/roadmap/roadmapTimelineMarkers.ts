/**
 * Timeline tip placements and ESAT-focused guidance copy for the practice roadmap.
 */

import type { RoadmapStage } from "@/lib/papers/roadmapConfig";

export interface TimelineMarker {
  stageIndex: number;
  examName: string;
  title: string;
  text: string;
}

export function buildRoadmapTimelineMarkers(stages: RoadmapStage[]): TimelineMarker[] {
  const markers: TimelineMarker[] = [];

  let currentExam = "";
  let nsaaStartIndex = -1;
  let nsaaEndIndex = -1;
  let engaaStartIndex = -1;
  let engaaEndIndex = -1;
  let tmuaStartIndex = -1;
  let tmuaEndIndex = -1;
  let nsaa2023Index = -1;

  stages.forEach((stage, index) => {
    if (stage.examName !== currentExam) {
      currentExam = stage.examName;

      if (stage.examName === "NSAA") {
        if (nsaaStartIndex === -1) nsaaStartIndex = index;
        if (stage.year === 2023) nsaa2023Index = index;
        nsaaEndIndex = index;
      } else if (stage.examName === "ENGAA") {
        if (engaaStartIndex === -1) engaaStartIndex = index;
        engaaEndIndex = index;
      } else if (stage.examName === "TMUA") {
        if (tmuaStartIndex === -1) tmuaStartIndex = index;
        tmuaEndIndex = index;
      }
    }
  });

  if (nsaaStartIndex >= 0 && nsaaEndIndex >= 0) {
    const nsaaRange = nsaaEndIndex - nsaaStartIndex;
    if (nsaaRange >= 2) {
      markers.push({
        stageIndex: nsaaStartIndex + 1,
        examName: "NSAA",
        title: "Sections",
        text: "Only sit the maths and science parts you need for ESAT — leave unused NSAA sections unchecked.",
      });
    }
    if (nsaaRange >= 4) {
      markers.push({
        stageIndex: nsaaStartIndex + Math.floor(nsaaRange / 2),
        examName: "NSAA",
        title: "Pacing",
        text: "Aim for roughly 90 seconds per question in Section 1. Move on and return if you are stuck.",
      });
    }
  }

  if (engaaStartIndex >= 0) {
    markers.push({
      stageIndex: engaaStartIndex,
      examName: "ENGAA",
      title: "After NSAA",
      text: "Use ENGAA once core NSAA papers are done. Section 2 is closest to ESAT Maths 2.",
    });
  }

  if (engaaStartIndex >= 0 && engaaEndIndex >= 0) {
    const engaaRange = engaaEndIndex - engaaStartIndex;
    markers.push({
      stageIndex: engaaStartIndex + 1,
      examName: "ENGAA",
      title: "Overlap",
      text: "Much of ENGAA repeats NSAA material — the roadmap skips parts you have already finished.",
    });

    if (engaaRange >= 3) {
      markers.push({
        stageIndex: engaaStartIndex + Math.floor(engaaRange / 2),
        examName: "ENGAA",
        title: "Syllabus",
        text: "Some ENGAA topics are not examined on ESAT. Skip parts that do not match your specification.",
      });
    }
  }

  if (tmuaStartIndex >= 0) {
    markers.push({
      stageIndex: tmuaStartIndex,
      examName: "TMUA",
      title: "Optional",
      text: "TMUA is stretch practice for ESAT Maths 2 — do it after ENGAA if you want harder multi-step questions.",
    });
  }

  if (tmuaStartIndex >= 0 && tmuaEndIndex >= 0) {
    const tmuaRange = tmuaEndIndex - tmuaStartIndex;
    if (tmuaRange >= 3) {
      markers.push({
        stageIndex: tmuaStartIndex + Math.floor(tmuaRange / 2),
        examName: "TMUA",
        title: "Timing",
        text: "Allow a little extra time per question here. Use TMUA for technique, not as your main timed mock.",
      });
    }
  }

  if (nsaa2023Index >= 0) {
    markers.push({
      stageIndex: nsaa2023Index,
      examName: "NSAA",
      title: "Final mock",
      text: "Save your last NSAA paper for a full timed run under ESAT conditions — no notes, strict clock.",
    });
  }

  return markers;
}
