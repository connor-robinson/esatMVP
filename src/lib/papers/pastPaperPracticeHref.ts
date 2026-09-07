export type PastPaperPracticeExamType = "official" | "specimen";

export type PastPaperPracticeTarget = {
  exam: "NSAA" | "ENGAA";
  year?: number;
  sectionSlug: "section-1" | "section-2";
  examType?: PastPaperPracticeExamType;
};

const PRACTICE_START_PATH = "/past-papers/solve/start";

export function pastPaperPracticeHref(target: PastPaperPracticeTarget): string {
  const params = new URLSearchParams();
  params.set("exam", target.exam.toLowerCase());
  if (target.year && target.year > 0) {
    params.set("year", String(target.year));
  }
  params.set("section", target.sectionSlug);
  if (target.examType === "specimen") {
    params.set("type", "specimen");
  }
  return `${PRACTICE_START_PATH}?${params.toString()}`;
}

export function parsePastPaperPracticeSearchParams(
  searchParams: { get: (name: string) => string | null },
): PastPaperPracticeTarget | null {
  const examRaw = (searchParams.get("exam") ?? "").trim().toUpperCase();
  if (examRaw !== "NSAA" && examRaw !== "ENGAA") return null;

  const sectionRaw = (searchParams.get("section") ?? "").trim().toLowerCase();
  if (sectionRaw !== "section-1" && sectionRaw !== "section-2") return null;

  const yearRaw = searchParams.get("year");
  const year = yearRaw ? Number(yearRaw) : undefined;
  if (yearRaw && (!Number.isInteger(year) || year! < 1)) return null;

  const typeRaw = (searchParams.get("type") ?? "").trim().toLowerCase();
  const examType: PastPaperPracticeExamType | undefined =
    typeRaw === "specimen" ? "specimen" : undefined;

  if (examType !== "specimen" && !year) return null;

  return {
    exam: examRaw,
    sectionSlug: sectionRaw,
    ...(year ? { year } : {}),
    ...(examType ? { examType } : {}),
  };
}

export function practiceSectionLabel(
  sectionSlug: "section-1" | "section-2",
): "Section 1" | "Section 2" {
  return sectionSlug === "section-2" ? "Section 2" : "Section 1";
}
