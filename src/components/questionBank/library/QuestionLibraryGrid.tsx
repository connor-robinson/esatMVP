"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, Check, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/shared/MathContent";
import type {
  QuestionBankQuestion,
  SubjectFilter,
  DifficultyFilter,
  AttemptedFilter,
  AttemptResultFilter,
} from "@/types/questionBank";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getSubjectAccentTextClass,
  getSubjectAccentBadgeClass,
} from "@/lib/questionBank/subjectColors";
import {
  visibleLibrarySubjects,
  isLibrarySearchActive,
  libraryFiltersKey,
  type LibraryFilters,
  UNTAGGED_TOPIC,
} from "@/lib/questionBank/libraryQueryParams";
import {
  clearLibraryCaches,
  fetchLibraryOutline,
  fetchLibraryTagQuestions,
  fetchLibrarySearchResults,
  type LibraryOutline,
} from "@/lib/questionBank/libraryData";
import { QuestionLibraryFilters } from "./QuestionLibraryFilters";
import { LibrarySectionLoading } from "./LibrarySectionLoading";

interface QuestionLibraryGridProps {
  selectedQuestionIds: Set<string>;
  onToggleQuestion: (question: QuestionBankQuestion) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  subjectFilter: SubjectFilter | SubjectFilter[] | "ALL";
  onSubjectFilterChange: (value: SubjectFilter | SubjectFilter[] | "ALL") => void;
  difficultyFilter: DifficultyFilter | DifficultyFilter[] | "ALL";
  onDifficultyFilterChange: (value: DifficultyFilter | DifficultyFilter[] | "ALL") => void;
  attemptedStatusFilter: AttemptedFilter;
  onAttemptedStatusFilterChange: (value: AttemptedFilter) => void;
  attemptResultFilter: AttemptResultFilter | AttemptResultFilter[] | "ALL";
  onAttemptResultFilterChange: (
    value: AttemptResultFilter | AttemptResultFilter[] | "ALL",
  ) => void;
}

type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };

function getDifficultyBadgeClass(difficulty: string): string {
  if (difficulty === "Easy") return "bg-primary/15 text-primary";
  if (difficulty === "Medium") return "bg-warning/15 text-warning";
  if (difficulty === "Hard") return "bg-error/15 text-error";
  return "bg-surface-mid text-text-muted";
}

function getSubjectFromQuestion(question: QuestionBankQuestion): string {
  if (question.subjects) return question.subjects;
  if (question.schema_id?.startsWith("P")) return "Physics";
  if (question.schema_id?.startsWith("C")) return "Chemistry";
  if (question.schema_id?.startsWith("B")) return "Biology";
  if (question.primary_tag?.startsWith("M2-")) return "Math 2";
  if (question.primary_tag?.startsWith("M1-")) return "Math 1";
  if (question.schema_id?.startsWith("M")) return "Math 1";
  return "Unknown";
}

function sortSubjects(subjects: string[]): string[] {
  return [...subjects].sort((a, b) => {
    const isMathA = a === "Math 1" || a === "Math 2";
    const isMathB = b === "Math 1" || b === "Math 2";
    if (isMathA && !isMathB) return 1;
    if (!isMathA && isMathB) return -1;
    return a.localeCompare(b);
  });
}

function QuestionRow({
  question,
  subject,
  isSelected,
  hasAttempted,
  onToggle,
}: {
  question: QuestionBankQuestion;
  subject: string;
  isSelected: boolean;
  hasAttempted: boolean;
  onToggle: () => void;
}) {
  const questionId = question.generation_id || question.id;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex h-auto min-h-[2.75rem] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-fast ease-signature",
        isSelected
          ? "bg-surface-neutral"
          : "bg-surface-mid hover:bg-surface-neutral/80",
      )}
    >
      <div
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors",
          isSelected ? "bg-secondary text-background" : "bg-surface-elevated",
        )}
      >
        {isSelected ? (
          <Check className="h-3 w-3 stroke-[3]" aria-hidden />
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-heading text-xs font-semibold text-text">
            {questionId}
          </span>
          {hasAttempted ? (
            <CheckCircle2
              className="h-3.5 w-3.5 text-success"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              "rounded-organic-sm px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide",
              getDifficultyBadgeClass(question.difficulty),
            )}
          >
            {question.difficulty}
          </span>
          <span
            className={cn(
              "rounded-organic-sm px-1.5 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide",
              getSubjectAccentBadgeClass(subject),
            )}
          >
            {subject}
          </span>
        </div>
        <div className="line-clamp-2 font-heading text-xs leading-relaxed text-text-muted">
          <MathContent
            content={question.question_stem}
            className="text-inherit"
          />
        </div>
      </div>
    </button>
  );
}

export function QuestionLibraryGrid({
  selectedQuestionIds,
  onToggleQuestion,
  searchQuery,
  onSearchChange,
  subjectFilter,
  onSubjectFilterChange,
  difficultyFilter,
  onDifficultyFilterChange,
  attemptedStatusFilter,
  onAttemptedStatusFilterChange,
  attemptResultFilter,
  onAttemptResultFilterChange,
}: QuestionLibraryGridProps) {
  const session = useSupabaseSession();

  const filters: LibraryFilters = useMemo(
    () => ({
      searchQuery,
      subjectFilter,
      difficultyFilter,
      attemptedStatusFilter,
      attemptResultFilter,
    }),
    [
      searchQuery,
      subjectFilter,
      difficultyFilter,
      attemptedStatusFilter,
      attemptResultFilter,
    ],
  );

  const filtersKey = libraryFiltersKey(filters);
  const searchActive = isLibrarySearchActive(filters);
  const visibleSubjects = useMemo(
    () => sortSubjects(visibleLibrarySubjects(filters)),
    [filters, subjectFilter],
  );

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(),
  );
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [subjectOutlines, setSubjectOutlines] = useState<
    Record<string, LoadState<LibraryOutline>>
  >({});
  const [tagQuestions, setTagQuestions] = useState<
    Record<string, LoadState<QuestionBankQuestion[]>>
  >({});
  const [searchState, setSearchState] = useState<
    LoadState<QuestionBankQuestion[]>
  >({ status: "idle" });

  const [curriculum, setCurriculum] = useState<unknown>(null);
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<
    Set<string>
  >(new Set());

  const filtersKeyRef = useRef(filtersKey);
  filtersKeyRef.current = filtersKey;

  useEffect(() => {
    fetch("/api/question-bank/curriculum")
      .then((res) => res.json())
      .then(setCurriculum)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setAttemptedQuestionIds(new Set());
      return;
    }
    fetch(`/api/question-bank/attempts?limit=10000`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.attempts) {
          setAttemptedQuestionIds(
            new Set<string>(
              data.attempts.map((a: { question_id: string }) =>
                String(a.question_id),
              ),
            ),
          );
        }
      })
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => {
    clearLibraryCaches();
    setExpandedSubjects(new Set());
    setExpandedTags(new Set());
    setSubjectOutlines({});
    setTagQuestions({});
    setSearchState({ status: "idle" });
  }, [filtersKey]);

  const getTopicTitle = useCallback(
    (tagCode: string): string => {
      if (!tagCode || tagCode === UNTAGGED_TOPIC) return "Untagged";
      const prefixes = [
        "Math 1",
        "Math 2",
        "Physics",
        "Chemistry",
        "Biology",
        "Paper 1",
        "Paper 2",
      ];
      for (const p of prefixes) {
        if (new RegExp(`^${p}\\s*-\\s*`, "i").test(tagCode)) {
          return tagCode.replace(new RegExp(`^${p}\\s*-\\s*`, "i"), "").trim();
        }
      }
      const cur = curriculum as {
        papers?: Array<{
          paper_id: string;
          topics?: Array<{ code: string; title: string }>;
        }>;
      } | null;
      if (!cur?.papers) return tagCode;
      let paperId = "";
      let cleanCode = "";
      if (tagCode.startsWith("M1-")) {
        paperId = "math1";
        cleanCode = tagCode.replace("M1-", "");
      } else if (tagCode.startsWith("M2-")) {
        paperId = "math2";
        cleanCode = tagCode.replace("M2-", "");
      } else if (tagCode.startsWith("P-")) {
        paperId = "physics";
        cleanCode = tagCode.replace("P-", "");
      } else if (tagCode.startsWith("biology-")) {
        paperId = "biology";
        cleanCode = tagCode.replace("biology-", "");
      } else if (tagCode.startsWith("chemistry-")) {
        paperId = "chemistry";
        cleanCode = tagCode.replace("chemistry-", "");
      }
      if (!paperId) {
        for (const paper of cur.papers ?? []) {
          const topic = paper.topics?.find(
            (t) =>
              t.code === tagCode || t.code === tagCode.replace(/^[A-Z]+/, ""),
          );
          if (topic) return topic.title;
        }
        return tagCode;
      }
      const paper = cur.papers?.find((p) => p.paper_id === paperId);
      if (!paper) return tagCode;
      const topic =
        paper.topics?.find((t) => t.code === cleanCode) ??
        paper.topics?.find(
          (t) => t.code === cleanCode.replace(/^[A-Z]+/, ""),
        ) ??
        paper.topics?.find((t) => t.code === tagCode);
      return topic?.title ?? tagCode;
    },
    [curriculum],
  );

  const loadSubjectOutline = useCallback(
    async (subject: string) => {
      const requestKey = filtersKeyRef.current;
      setSubjectOutlines((prev) => ({
        ...prev,
        [subject]: { status: "loading" },
      }));
      try {
        const data = await fetchLibraryOutline(subject, filters);
        if (filtersKeyRef.current !== requestKey) return;
        setSubjectOutlines((prev) => ({
          ...prev,
          [subject]: { status: "ready", data },
        }));
      } catch {
        if (filtersKeyRef.current !== requestKey) return;
        setSubjectOutlines((prev) => ({
          ...prev,
          [subject]: { status: "error", message: "Failed to load topics" },
        }));
      }
    },
    [filters],
  );

  const loadTagQuestions = useCallback(
    async (subject: string, tag: string, tagKey: string) => {
      const requestKey = filtersKeyRef.current;
      setTagQuestions((prev) => ({
        ...prev,
        [tagKey]: { status: "loading" },
      }));
      try {
        const data = await fetchLibraryTagQuestions(subject, tag, filters);
        if (filtersKeyRef.current !== requestKey) return;
        setTagQuestions((prev) => ({
          ...prev,
          [tagKey]: { status: "ready", data },
        }));
      } catch {
        if (filtersKeyRef.current !== requestKey) return;
        setTagQuestions((prev) => ({
          ...prev,
          [tagKey]: {
            status: "error",
            message: "Failed to load questions",
          },
        }));
      }
    },
    [filters],
  );

  const toggleSubject = (subject: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      const willExpand = !next.has(subject);
      if (willExpand) {
        next.add(subject);
        const outline = subjectOutlines[subject];
        if (!outline || outline.status === "idle") {
          void loadSubjectOutline(subject);
        }
      } else {
        next.delete(subject);
      }
      return next;
    });
  };

  const toggleTag = (subject: string, tag: string, tagKey: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      const willExpand = !next.has(tagKey);
      if (willExpand) {
        next.add(tagKey);
        const loaded = tagQuestions[tagKey];
        if (!loaded || loaded.status === "idle") {
          void loadTagQuestions(subject, tag, tagKey);
        }
      } else {
        next.delete(tagKey);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!searchActive) {
      setSearchState({ status: "idle" });
      return;
    }

    const requestKey = filtersKeyRef.current;
    setSearchState({ status: "loading" });
    const timer = window.setTimeout(() => {
      void fetchLibrarySearchResults(filters)
        .then((data) => {
          if (filtersKeyRef.current !== requestKey) return;
          setSearchState({ status: "ready", data });
        })
        .catch(() => {
          if (filtersKeyRef.current !== requestKey) return;
          setSearchState({
            status: "error",
            message: "Failed to search questions",
          });
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchActive, filtersKey, filters]);

  const resultCount = useMemo(() => {
    if (searchActive) {
      if (searchState.status === "ready") return searchState.data.length;
      return null;
    }
    let total = 0;
    let hasAny = false;
    for (const subject of visibleSubjects) {
      const outline = subjectOutlines[subject];
      if (outline?.status === "ready") {
        total += outline.data.total;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  }, [searchActive, searchState, subjectOutlines, visibleSubjects]);

  return (
    <section className="flex h-full flex-col rounded-organic-xl bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-bold leading-none tracking-tight text-text sm:text-[1.35rem]">
            Question Library
          </h2>
          <span className="shrink-0 font-heading text-xs font-medium leading-none tabular-nums text-text-muted">
            {resultCount === null
              ? "Expand to browse"
              : `${resultCount} result${resultCount === 1 ? "" : "s"}`}
          </span>
        </div>

        <QuestionLibraryFilters
          embedded
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          subjectFilter={subjectFilter}
          onSubjectFilterChange={onSubjectFilterChange}
          difficultyFilter={difficultyFilter}
          onDifficultyFilterChange={onDifficultyFilterChange}
          attemptedStatusFilter={attemptedStatusFilter}
          onAttemptedStatusFilterChange={onAttemptedStatusFilterChange}
          attemptResultFilter={attemptResultFilter}
          onAttemptResultFilterChange={onAttemptResultFilterChange}
        />
      </div>

      {searchActive ? (
        <div className="mt-5 space-y-2 border-t border-border-subtle/40 pt-5">
          {searchState.status === "loading" ? (
            <LibrarySectionLoading label="Searching questions…" rows={3} />
          ) : searchState.status === "error" ? (
            <div className="py-8 text-center text-sm text-error">
              {searchState.message}
            </div>
          ) : searchState.status === "ready" && searchState.data.length === 0 ? (
            <div className="flex min-h-[14rem] items-center justify-center rounded-organic-md bg-surface-mid/35 px-4 text-sm text-text-muted">
              No questions match your search.
            </div>
          ) : searchState.status === "ready" ? (
            <div className="space-y-1.5 rounded-organic-md bg-surface-mid/35 p-2">
              {searchState.data.map((question) => {
                const subject = getSubjectFromQuestion(question);
                return (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    subject={subject}
                    isSelected={selectedQuestionIds.has(question.id)}
                    hasAttempted={attemptedQuestionIds.has(question.id)}
                    onToggle={() => onToggleQuestion(question)}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 space-y-4 border-t border-border-subtle/40 pt-5">
          {visibleSubjects.map((subject) => {
            const accentClass = getSubjectAccentTextClass(subject);
            const isExpanded = expandedSubjects.has(subject);
            const outline = subjectOutlines[subject];
            const subjectCount =
              outline?.status === "ready" ? outline.data.total : null;

            return (
              <div
                key={subject}
                className="overflow-hidden rounded-organic-lg bg-surface-mid/35"
              >
                <button
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className="group flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-surface-mid/70"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-200",
                        accentClass,
                        !isExpanded && "-rotate-90",
                      )}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "font-heading text-sm font-semibold uppercase tracking-wide",
                        accentClass,
                      )}
                    >
                      {subject}
                    </span>
                  </div>
                  <span className="font-heading text-xs text-text-muted">
                    {subjectCount === null
                      ? "—"
                      : `${subjectCount} question${subjectCount === 1 ? "" : "s"}`}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 p-4">
                        {outline?.status === "loading" ||
                        outline?.status === "idle" ? (
                          <LibrarySectionLoading label="Loading topics…" />
                        ) : outline?.status === "error" ? (
                          <div className="py-4 text-center text-xs text-error">
                            {outline.message}
                          </div>
                        ) : outline?.status === "ready" &&
                          outline.data.tags.length === 0 ? (
                          <div className="py-4 text-center text-xs text-text-muted">
                            No questions in this subject for the current filters.
                          </div>
                        ) : outline?.status === "ready" ? (
                          outline.data.tags.map(({ tag, count }) => {
                            const tagKey = `${subject}-${tag}`;
                            const isTagExpanded = expandedTags.has(tagKey);
                            const loaded = tagQuestions[tagKey];

                            return (
                              <div
                                key={tagKey}
                                className="overflow-hidden rounded-organic-md bg-surface-elevated"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleTag(subject, tag, tagKey)}
                                  className="flex h-11 w-full items-center justify-between gap-3 px-4 transition-colors hover:bg-surface-mid"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                                        accentClass,
                                        !isTagExpanded && "-rotate-90",
                                      )}
                                      strokeWidth={2.5}
                                      aria-hidden
                                    />
                                    <span className="truncate font-heading text-sm font-medium text-text">
                                      {getTopicTitle(tag)}
                                    </span>
                                  </div>
                                  <span className="shrink-0 font-heading text-xs tabular-nums text-text-muted">
                                    {count}
                                  </span>
                                </button>

                                <AnimatePresence initial={false}>
                                  {isTagExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{
                                        duration: 0.2,
                                        ease: [0.32, 0.72, 0, 1],
                                      }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-1.5 border-t border-border-subtle/40 p-2">
                                        {loaded?.status === "loading" ||
                                        loaded?.status === "idle" ? (
                                          <LibrarySectionLoading
                                            label="Loading questions…"
                                            rows={1}
                                          />
                                        ) : loaded?.status === "error" ? (
                                          <div className="py-3 text-center text-xs text-error">
                                            {loaded.message}
                                          </div>
                                        ) : loaded?.status === "ready" ? (
                                          loaded.data.map((question) => (
                                            <QuestionRow
                                              key={question.id}
                                              question={question}
                                              subject={subject}
                                              isSelected={selectedQuestionIds.has(
                                                question.id,
                                              )}
                                              hasAttempted={attemptedQuestionIds.has(
                                                question.id,
                                              )}
                                              onToggle={() =>
                                                onToggleQuestion(question)
                                              }
                                            />
                                          ))
                                        ) : null}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
