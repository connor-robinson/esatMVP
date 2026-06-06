import type {
  SubjectFilter,
  DifficultyFilter,
  AttemptedFilter,
  AttemptResultFilter,
} from "@/types/questionBank";

export const LIBRARY_SUBJECTS = [
  "Math 1",
  "Math 2",
  "Physics",
  "Chemistry",
  "Biology",
  "Paper 1",
  "Paper 2",
] as const;

export type LibrarySubject = (typeof LIBRARY_SUBJECTS)[number];

export const UNTAGGED_TOPIC = "Untagged";

export type LibraryFilters = {
  searchQuery: string;
  subjectFilter: SubjectFilter | SubjectFilter[] | "ALL";
  difficultyFilter: DifficultyFilter | DifficultyFilter[] | "ALL";
  attemptedStatusFilter: AttemptedFilter;
  attemptResultFilter: AttemptResultFilter | AttemptResultFilter[] | "ALL";
};

export function buildLibraryQueryParams(
  filters: LibraryFilters,
  extra?: Record<string, string>,
): URLSearchParams {
  const params = new URLSearchParams(extra);

  if (filters.subjectFilter !== "ALL") {
    const subjects = Array.isArray(filters.subjectFilter)
      ? filters.subjectFilter
      : [filters.subjectFilter];
    params.append("subject", subjects.join(","));
  }

  if (filters.difficultyFilter !== "ALL") {
    const difficulties = Array.isArray(filters.difficultyFilter)
      ? filters.difficultyFilter
      : [filters.difficultyFilter];
    params.append("difficulty", difficulties.join(","));
  }

  if (filters.attemptedStatusFilter !== "Mix") {
    params.append("attemptedStatus", filters.attemptedStatusFilter);
  }

  if (filters.attemptResultFilter !== "ALL") {
    const results = Array.isArray(filters.attemptResultFilter)
      ? filters.attemptResultFilter
      : [filters.attemptResultFilter];
    params.append("attemptResult", results.join(","));
  }

  const q = filters.searchQuery.trim();
  if (q) {
    const idPattern = /^C_[a-zA-Z0-9]+$/i;
    const uuidPattern =
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (idPattern.test(q) || uuidPattern.test(q)) {
      params.append("id", q);
    } else {
      params.append("search", q);
    }
  }

  return params;
}

export function libraryFiltersKey(filters: LibraryFilters): string {
  return buildLibraryQueryParams(filters).toString();
}

export function visibleLibrarySubjects(
  filters: LibraryFilters,
): LibrarySubject[] {
  if (filters.subjectFilter === "ALL") {
    return [...LIBRARY_SUBJECTS];
  }
  const selected = Array.isArray(filters.subjectFilter)
    ? filters.subjectFilter
    : [filters.subjectFilter];
  return LIBRARY_SUBJECTS.filter((s) => selected.includes(s));
}

export function isLibrarySearchActive(filters: LibraryFilters): boolean {
  return filters.searchQuery.trim().length > 0;
}
