import type { QuestionBankQuestion } from "@/types/questionBank";
import {
  buildLibraryQueryParams,
  type LibraryFilters,
  UNTAGGED_TOPIC,
} from "@/lib/questionBank/libraryQueryParams";

export type LibraryOutlineTag = { tag: string; label: string; count: number };

export type LibraryOutline = {
  subject: string;
  total: number;
  tags: LibraryOutlineTag[];
};

const outlineCache = new Map<string, LibraryOutline>();
const outlineInFlight = new Map<string, Promise<LibraryOutline>>();

const tagQuestionsCache = new Map<string, QuestionBankQuestion[]>();
const tagQuestionsInFlight = new Map<string, Promise<QuestionBankQuestion[]>>();

const searchCache = new Map<string, QuestionBankQuestion[]>();
const searchInFlight = new Map<string, Promise<QuestionBankQuestion[]>>();

function outlineCacheKey(subject: string, filters: LibraryFilters): string {
  return `${subject}::${buildLibraryQueryParams(filters).toString()}`;
}

function tagCacheKey(
  subject: string,
  tag: string,
  filters: LibraryFilters,
): string {
  return `${subject}::${tag}::${buildLibraryQueryParams(filters).toString()}`;
}

export function clearLibraryCaches(): void {
  outlineCache.clear();
  outlineInFlight.clear();
  tagQuestionsCache.clear();
  tagQuestionsInFlight.clear();
  searchCache.clear();
  searchInFlight.clear();
}

export async function fetchLibraryOutline(
  subject: string,
  filters: LibraryFilters,
): Promise<LibraryOutline> {
  const key = outlineCacheKey(subject, filters);
  const cached = outlineCache.get(key);
  if (cached) return cached;

  const existing = outlineInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const params = buildLibraryQueryParams(filters);
    params.set("subject", subject);
    const response = await fetch(
      `/api/question-bank/library-outline?${params.toString()}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Failed to load topics");
    }
    const data = (await response.json()) as LibraryOutline;
    outlineCache.set(key, data);
    return data;
  })();

  outlineInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    outlineInFlight.delete(key);
  }
}

export async function fetchLibraryTagQuestions(
  subject: string,
  tag: string,
  filters: LibraryFilters,
): Promise<QuestionBankQuestion[]> {
  const key = tagCacheKey(subject, tag, filters);
  const cached = tagQuestionsCache.get(key);
  if (cached) return cached;

  const existing = tagQuestionsInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const params = buildLibraryQueryParams(filters);
    params.set("subject", subject);
    params.set("limit", "500");
    params.set("offset", "0");
    params.set("random", "false");

    if (tag === UNTAGGED_TOPIC) {
      params.set("untagged", "1");
    } else {
      params.set("primaryTag", tag);
    }

    const response = await fetch(
      `/api/question-bank/questions?${params.toString()}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Failed to load questions");
    }
    const data = await response.json();
    const questions = (data.questions || []) as QuestionBankQuestion[];
    const sorted = [...questions].sort((a, b) =>
      (a.generation_id || a.id).localeCompare(b.generation_id || b.id),
    );
    tagQuestionsCache.set(key, sorted);
    return sorted;
  })();

  tagQuestionsInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    tagQuestionsInFlight.delete(key);
  }
}

export async function fetchLibrarySearchResults(
  filters: LibraryFilters,
  limit = 100,
): Promise<QuestionBankQuestion[]> {
  const params = buildLibraryQueryParams(filters);
  params.set("limit", String(limit));
  params.set("offset", "0");
  params.set("random", "false");
  const key = params.toString();

  const cached = searchCache.get(key);
  if (cached) return cached;

  const existing = searchInFlight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const response = await fetch(
      `/api/question-bank/questions?${params.toString()}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Failed to search questions");
    }
    const data = await response.json();
    const questions = (data.questions || []) as QuestionBankQuestion[];
    searchCache.set(key, questions);
    return questions;
  })();

  searchInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    searchInFlight.delete(key);
  }
}
