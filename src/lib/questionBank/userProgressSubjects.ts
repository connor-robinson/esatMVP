export type ExamPreference = "ESAT" | "TMUA" | null;

/** Subjects included in the main question bank progress bar for this user. */
export function subjectsForExamProgress(
  examPreference: ExamPreference,
  esatSubjects: string[] | null | undefined,
): string[] {
  if (examPreference === "TMUA") {
    return ["Paper 1", "Paper 2"];
  }
  if (
    examPreference === "ESAT" &&
    Array.isArray(esatSubjects) &&
    esatSubjects.length === 3
  ) {
    return esatSubjects;
  }
  return [];
}

export function progressScopeLabel(examPreference: ExamPreference): string {
  if (examPreference === "TMUA") return "TMUA";
  if (examPreference === "ESAT") return "ESAT";
  return "ESAT / TMUA";
}

export function progressSubtext(
  examPreference: ExamPreference,
  esatSubjects: string[] | null | undefined,
  attempted: number,
  total: number,
): string {
  const scope = progressScopeLabel(examPreference);
  const configured = subjectsForExamProgress(examPreference, esatSubjects);
  if (configured.length === 0) {
    if (examPreference === "ESAT") {
      return "Select your 3 ESAT subjects in profile to track progress";
    }
    return "Set your ESAT or TMUA subjects in profile to track progress";
  }
  return `${attempted} / ${total} questions attempted out of your ${scope} subjects`;
}
