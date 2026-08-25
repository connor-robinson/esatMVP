import { examNameToPaperType } from "@/lib/papers/paperConfig";
import { paperSectionsForEsatSubjects } from "@/lib/papers/esatSubjectSectionMapping";
import { shouldShowTmuaOnRoadmap } from "@/lib/papers/tmuaRoadmapParts";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";
import type { ExamName, PaperSection } from "@/types/papers";

function normalizeEsatSubjects(
  esatSubjects: string[] | null | undefined,
): string[] | null {
  if (!esatSubjects?.length) return null;
  return esatSubjects;
}

/** Whether a roadmap part matches the user's ESAT module choices. */
export function roadmapPartMatchesEsatSubjects(
  part: RoadmapPart,
  examName: ExamName,
  esatSubjects: string[] | null | undefined,
): boolean {
  const subjects = normalizeEsatSubjects(esatSubjects);
  if (!subjects) return true;

  const paperType = examNameToPaperType(examName);
  if (paperType === "TMUA") return true;

  const desired = paperSectionsForEsatSubjects(subjects, paperType);
  if (!desired?.length) return true;

  const desiredSet = new Set<PaperSection>(desired);

  if (examName === "ENGAA") {
    const hasMath1 = subjects.includes("Math 1");
    const hasMath2 = subjects.includes("Math 2");
    const hasPhysics = subjects.includes("Physics");

    if (part.internalTrack === "maths") {
      return hasMath1 || hasMath2;
    }
    if (part.internalTrack === "physics") {
      return hasPhysics;
    }
    if (part.partName === "Advanced Mathematics and Advanced Physics") {
      return hasMath2 || hasPhysics || hasMath1;
    }
    if (part.partName === "Mathematics and Physics") {
      return hasMath1 || hasMath2 || hasPhysics;
    }
    if (part.partName === "Physics") {
      return hasPhysics;
    }
  }

  return desiredSet.has(part.partName as PaperSection);
}

export function filterRoadmapStageByEsatSubjects(
  stage: RoadmapStage,
  esatSubjects: string[] | null | undefined,
  examPreference: "ESAT" | "TMUA" | null,
): RoadmapStage | null {
  // Always show ESATCamp Mock as its own roadmap block.
  if (stage.id === "esat-camp-mock-papers") {
    return stage;
  }

  if (stage.examName === "TMUA") {
    if (!shouldShowTmuaOnRoadmap(esatSubjects, examPreference)) {
      return null;
    }
    return stage;
  }

  if (examPreference === "TMUA") {
    return null;
  }

  const parts = stage.parts.filter((part) =>
    roadmapPartMatchesEsatSubjects(part, stage.examName, esatSubjects),
  );

  if (parts.length === 0) return null;

  return { ...stage, parts };
}

export function applyEsatSubjectsToRoadmapStages(
  stages: RoadmapStage[],
  esatSubjects: string[] | null | undefined,
  examPreference: "ESAT" | "TMUA" | null,
): RoadmapStage[] {
  return stages
    .map((stage) =>
      filterRoadmapStageByEsatSubjects(stage, esatSubjects, examPreference),
    )
    .filter((stage): stage is RoadmapStage => stage !== null);
}
