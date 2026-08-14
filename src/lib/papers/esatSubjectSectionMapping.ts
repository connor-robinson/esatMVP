import { examNameToPaperType } from "@/lib/papers/paperConfig";
import type { SubjectTileKey } from "@/lib/questionBank/subjectTileTheme";
import type { ExamName, Paper, PaperSection } from "@/types/papers";

const ESAT_SUBJECT_KEYS: SubjectTileKey[] = [
  "Math 1",
  "Math 2",
  "Chemistry",
  "Biology",
  "Physics",
];

function isEsatSubjectKey(value: string): value is SubjectTileKey {
  return (ESAT_SUBJECT_KEYS as readonly string[]).includes(value);
}

/**
 * Past-paper section names implied by each ESAT module choice.
 * Math 1 also includes advanced math sections when the paper offers them (e.g. NSAA ≤2019).
 */
const ESAT_SUBJECT_TO_PAPER_SECTIONS: Record<
  SubjectTileKey,
  PaperSection[]
> = {
  "Math 1": ["Mathematics", "Advanced Mathematics and Advanced Physics"],
  "Math 2": ["Advanced Mathematics and Advanced Physics"],
  Physics: ["Physics"],
  Chemistry: ["Chemistry"],
  Biology: ["Biology"],
};

/** ENGAA uses combined section names instead of separate science parts. */
function paperSectionsForEngaa(esatSubjects: SubjectTileKey[]): PaperSection[] {
  const sections = new Set<PaperSection>();
  const hasMath =
    esatSubjects.includes("Math 1") || esatSubjects.includes("Math 2");
  const hasPhysics = esatSubjects.includes("Physics");

  if (hasMath || hasPhysics) {
    sections.add("Mathematics and Physics");
  }
  if (esatSubjects.includes("Math 1") || esatSubjects.includes("Math 2")) {
    sections.add("Advanced Mathematics and Advanced Physics");
  }

  return Array.from(sections);
}

/** Limit ESAT subjects used when adding a paper (e.g. first tutorial add). */
export function esatSubjectsForPaperAdd(
  esatSubjects: string[] | null | undefined,
  options?: { firstPaperOnly?: boolean },
): string[] | null {
  if (!esatSubjects?.length) return null;
  if (options?.firstPaperOnly) return [esatSubjects[0]!];
  return esatSubjects;
}

/** Resolve which past-paper subject parts match the user's ESAT modules. */
export function paperSectionsForEsatSubjects(
  esatSubjects: string[] | null | undefined,
  paperType: ReturnType<typeof examNameToPaperType>,
): PaperSection[] | null {
  if (!esatSubjects?.length) return null;

  const normalized = esatSubjects.filter(isEsatSubjectKey);
  if (normalized.length === 0) return null;

  if (paperType === "ENGAA") {
    return paperSectionsForEngaa(normalized);
  }

  if (
    paperType === "NSAA" ||
    paperType === "ESAT" ||
    paperType === "PAT" ||
    paperType === "OTHER"
  ) {
    const sections = new Set<PaperSection>();
    for (const subject of normalized) {
      for (const section of ESAT_SUBJECT_TO_PAPER_SECTIONS[subject]) {
        sections.add(section);
      }
    }
    return Array.from(sections);
  }

  // TMUA / MAT / etc. — ESAT subject prefs do not apply.
  return null;
}

/**
 * Keep only subject parts that match the user's ESAT modules.
 * Falls back to the original map when nothing would remain.
 */
export function filterSectionsByEsatSubjects(
  sectionsByMain: Map<string, Set<PaperSection>>,
  paper: Paper,
  esatSubjects: string[] | null | undefined,
): Map<string, Set<PaperSection>> {
  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const desired = paperSectionsForEsatSubjects(esatSubjects, paperType);
  if (!desired?.length) return sectionsByMain;

  const desiredSet = new Set(desired);
  const filtered = new Map<string, Set<PaperSection>>();

  sectionsByMain.forEach((subjectParts, mainSectionName) => {
    const kept = new Set<PaperSection>();
    subjectParts.forEach((part) => {
      if (desiredSet.has(part)) kept.add(part);
    });
    if (kept.size > 0) {
      filtered.set(mainSectionName, kept);
    }
  });

  if (filtered.size === 0) return sectionsByMain;
  return filtered;
}

/** Filter a flat list of subject parts (single-section add). */
export function filterSubjectPartsByEsatSubjects(
  subjectParts: PaperSection[],
  paper: Paper,
  esatSubjects: string[] | null | undefined,
): PaperSection[] {
  const paperType = examNameToPaperType(paper.examName as ExamName) || "NSAA";
  const desired = paperSectionsForEsatSubjects(esatSubjects, paperType);
  if (!desired?.length) return subjectParts;

  const desiredSet = new Set(desired);
  const kept = subjectParts.filter((part) => desiredSet.has(part));
  return kept.length > 0 ? kept : subjectParts;
}
