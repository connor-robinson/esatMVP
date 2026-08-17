import type { ExamType } from "@/types/papers";
import type { RoadmapPart, RoadmapStage } from "./roadmapConfig";

/** TMUA years on the roadmap (shell + DB merge). */
export const TMUA_ROADMAP_YEARS = [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023,
] as const;

function tmuaPart(paperName: "Paper 1" | "Paper 2"): RoadmapPart {
  return {
    partKey: paperName === "Paper 1" ? "paper-1" : "paper-2",
    partLetter: "",
    partName: "",
    paperName,
    examType: "Official" as ExamType,
  };
}

/** Static TMUA stages for instant first paint (both papers; DB load may trim). */
export function buildTmuaRoadmapStagesShell(): RoadmapStage[] {
  return TMUA_ROADMAP_YEARS.map((year) => ({
    id: `tmua-${year}`,
    year,
    examName: "TMUA" as const,
    label: "Math 2 Practice",
    parts: [tmuaPart("Paper 1"), tmuaPart("Paper 2")],
  }));
}

/** Whether TMUA should appear on the roadmap for this user. */
export function shouldShowTmuaOnRoadmap(
  esatSubjects: string[] | null | undefined,
  examPreference: "ESAT" | "TMUA" | null,
): boolean {
  if (examPreference === "TMUA") return true;
  if (!esatSubjects?.length) return true;
  return esatSubjects.includes("Math 2");
}

/** Default selected TMUA parts: Paper 1 only unless Paper 1 is already done. */
export function defaultTmuaSelectedParts(
  stage: RoadmapStage,
  completionData: Map<string, boolean>,
  getPartKey: (part: RoadmapPart) => string,
): RoadmapPart[] {
  const paper1 = stage.parts.find((p) => p.paperName === "Paper 1");
  const paper2 = stage.parts.find((p) => p.paperName === "Paper 2");

  const incomplete = stage.parts.filter(
    (part) => !completionData.get(getPartKey(part)),
  );

  if (!paper1) return incomplete;

  const paper1Key = getPartKey(paper1);
  const paper1Done = completionData.get(paper1Key) || false;

  if (!paper1Done) {
    return incomplete.filter((p) => p.paperName === "Paper 1");
  }

  if (paper2 && !completionData.get(getPartKey(paper2))) {
    return [paper2];
  }

  return incomplete;
}
