import type { ExamType } from "@/types/papers";
import type { RoadmapPart } from "./roadmapConfig";

/** ENGAA Section 1 extras after doing the matching NSAA year (2016–2019). */
export const ENGAA_S1_EXTRAS: Record<
  number,
  { maths: readonly number[]; physics: readonly number[] }
> = {
  2016: { maths: [47, 49, 51], physics: [32, 42, 52, 54] },
  2017: { maths: [35, 37, 41, 51, 53], physics: [32, 36, 50, 52, 54] },
  2018: { maths: [35, 39, 45, 51], physics: [38, 42, 44, 50, 54] },
  2019: { maths: [25, 39], physics: [38] },
};

const S1_PART_A = "Mathematics and Physics";
const S1_PART_B = "Advanced Mathematics and Advanced Physics";

function oddUpTo(max: number): number[] {
  const out: number[] = [];
  for (let n = 1; n <= max; n += 2) out.push(n);
  return out;
}

function evenUpTo(max: number): number[] {
  const out: number[] = [];
  for (let n = 2; n <= max; n += 2) out.push(n);
  return out;
}

/** Section 1 question numbers classified as Maths vs Physics by year. */
export function engaaSection1MathsQuestions(year: number): number[] {
  if (year <= 2018) return oddUpTo(53);
  if (year === 2019) return oddUpTo(39);
  if (year === 2020) return evenUpTo(40);
  return oddUpTo(39);
}

export function engaaSection1PhysicsQuestions(year: number): number[] {
  if (year <= 2018) return evenUpTo(54);
  if (year === 2019) return evenUpTo(40);
  if (year === 2020) return oddUpTo(39);
  return evenUpTo(40);
}

/**
 * Parts that overlap the matching NSAA year start unchecked.
 * 2016 to 2019: Section 1 Part A. 2020 to 2023: Section 2.
 */
export function engaaPartDefaultSelected(
  year: number,
  paperName: string,
  partLetter: string,
): boolean {
  const letter = partLetter.trim().toLowerCase();
  if (year >= 2016 && year <= 2019) {
    return !(paperName === "Section 1" && letter === "part a");
  }
  if (year >= 2020 && year <= 2023) {
    return paperName !== "Section 2";
  }
  return true;
}

function part(
  partKey: string,
  paperName: string,
  partLetter: string,
  partName: string,
  year: number,
  options?: {
    displayGroupKey?: string;
    internalTrack?: "maths" | "physics";
    questionFilter?: number[];
    filterByQuestionNumbersOnly?: boolean;
  },
): RoadmapPart {
  return {
    partKey,
    displayGroupKey: options?.displayGroupKey,
    internalTrack: options?.internalTrack,
    partLetter,
    partName,
    paperName,
    examType: "Official" as ExamType,
    questionFilter: options?.questionFilter,
    filterByQuestionNumbersOnly: options?.filterByQuestionNumbersOnly,
    defaultSelected: engaaPartDefaultSelected(year, paperName, partLetter),
  };
}

/** Build ENGAA roadmap parts for one year following NSAA-overlap rules. */
export function buildEngaaPartsForYear(year: number): RoadmapPart[] {
  if (year < 2016 || year > 2023) return [];

  const s1PartAGroup = `s1-part-a-${year}`;

  return [
    part("s1-maths", "Section 1", "Part A", S1_PART_A, year, {
      displayGroupKey: s1PartAGroup,
      internalTrack: "maths",
      questionFilter: engaaSection1MathsQuestions(year),
    }),
    part("s1-physics", "Section 1", "Part A", S1_PART_A, year, {
      displayGroupKey: s1PartAGroup,
      internalTrack: "physics",
      questionFilter: engaaSection1PhysicsQuestions(year),
    }),
    part("s1-advanced", "Section 1", "Part B", S1_PART_B, year),
    part("s2-physics", "Section 2", "Part A", "Physics", year),
  ];
}

export function buildEngaaRoadmapStages(): Array<{
  id: string;
  year: number;
  examName: "ENGAA";
  label: string;
  parts: RoadmapPart[];
}> {
  return [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023].map((year) => ({
    id: `engaa-${year}`,
    year,
    examName: "ENGAA" as const,
    label: "Advanced Practice",
    parts: buildEngaaPartsForYear(year),
  }));
}
