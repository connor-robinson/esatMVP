import type { PaperSection } from "@/types/papers";
import { mapPartToSection } from "./sectionMapping";
import {
  engaaSection1MathsQuestions,
  engaaSection1PhysicsQuestions,
} from "./engaaRoadmapParts";

export type EngaaInternalTrack = "maths" | "physics";

export function engaaInternalTracksForEsatSubjects(
  esatSubjects: string[] | null | undefined,
): EngaaInternalTrack[] {
  if (!esatSubjects?.length) return ["maths", "physics"];

  const tracks: EngaaInternalTrack[] = [];
  if (esatSubjects.includes("Math 1") || esatSubjects.includes("Math 2")) {
    tracks.push("maths");
  }
  if (esatSubjects.includes("Physics")) {
    tracks.push("physics");
  }

  return tracks.length > 0 ? tracks : ["maths", "physics"];
}

export function engaaQuestionMatchesInternalTrack(
  questionNumber: number,
  year: number,
  track: EngaaInternalTrack,
): boolean {
  if (track === "maths") {
    return engaaSection1MathsQuestions(year).includes(questionNumber);
  }
  return engaaSection1PhysicsQuestions(year).includes(questionNumber);
}

type EngaaQuestionRow = {
  questionNumber: number;
  partLetter?: string | null;
  partName?: string | null;
};

/** Apply internal maths/physics split when ENGAA Section 1 Part A is shown as one section. */
export function filterEngaaQuestionsByEsatSubjects<T extends EngaaQuestionRow>(
  questions: T[],
  year: number,
  esatSubjects: string[] | null | undefined,
): T[] {
  if (!esatSubjects?.length) return questions;

  const tracks = engaaInternalTracksForEsatSubjects(esatSubjects);
  const hasMath =
    esatSubjects.includes("Math 1") || esatSubjects.includes("Math 2");
  const hasPhysics = esatSubjects.includes("Physics");

  return questions.filter((q) => {
    const section = mapPartToSection(
      { partLetter: q.partLetter ?? "", partName: q.partName ?? "" },
      "ENGAA",
    );

    if (section === "Mathematics and Physics") {
      return tracks.some((track) =>
        engaaQuestionMatchesInternalTrack(q.questionNumber, year, track),
      );
    }

    if (section === "Advanced Mathematics and Advanced Physics") {
      return hasMath || hasPhysics;
    }

    if (section === "Physics") {
      return hasPhysics;
    }

    return true;
  });
}

/** Merge split ENGAA library section names into the combined Part A label. */
export function normalizeEngaaPaperSections(
  sections: Iterable<string>,
): PaperSection[] {
  const set = new Set(sections);
  if (set.has("Mathematics") || set.has("Physics")) {
    set.delete("Mathematics");
    set.delete("Physics");
    set.add("Mathematics and Physics");
  }
  return Array.from(set) as PaperSection[];
}
