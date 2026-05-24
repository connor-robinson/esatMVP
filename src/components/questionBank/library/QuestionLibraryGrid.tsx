"use client";

import { useMemo, useState, useEffect } from "react";
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
import { QuestionLibraryFilters } from "./QuestionLibraryFilters";

interface QuestionLibraryGridProps {
  questions: QuestionBankQuestion[];
  selectedQuestionIds: Set<string>;
  onToggleQuestion: (questionId: string) => void;
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

export function QuestionLibraryGrid({
  questions,
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

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [curriculum, setCurriculum] = useState<unknown>(null);
  const [attemptedQuestionIds, setAttemptedQuestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/question-bank/curriculum")
      .then((res) => res.json())
      .then(setCurriculum)
      .catch(() => {});
  }, []);

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const questionIdsString = useMemo(() => questionIds.join(","), [questionIds]);

  useEffect(() => {
    if (session?.user && questionIds.length > 0) {
      fetch(`/api/question-bank/attempts?limit=1000`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.attempts) {
            setAttemptedQuestionIds(
              new Set<string>(
                data.attempts
                  .filter((a: { question_id: string }) =>
                    questionIds.includes(a.question_id),
                  )
                  .map((a: { question_id: string }) => String(a.question_id)),
              ),
            );
          }
        })
        .catch(() => {});
    }
  }, [session?.user, questionIdsString, questionIds]);

  const getTopicTitle = (tagCode: string): string => {
    if (!tagCode) return tagCode;
    const prefixes = ["Math 1", "Math 2", "Physics", "Chemistry", "Biology", "Paper 1", "Paper 2"];
    for (const p of prefixes) {
      if (new RegExp(`^${p}\\s*-\\s*`, "i").test(tagCode)) {
        return tagCode.replace(new RegExp(`^${p}\\s*-\\s*`, "i"), "").trim();
      }
    }
    const cur = curriculum as {
      papers?: Array<{ paper_id: string; topics?: Array<{ code: string; title: string }> }>;
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
          (t) => t.code === tagCode || t.code === tagCode.replace(/^[A-Z]+/, ""),
        );
        if (topic) return topic.title;
      }
      return tagCode;
    }
    const paper = cur.papers?.find((p) => p.paper_id === paperId);
    if (!paper) return tagCode;
    const topic =
      paper.topics?.find((t) => t.code === cleanCode) ??
      paper.topics?.find((t) => t.code === cleanCode.replace(/^[A-Z]+/, "")) ??
      paper.topics?.find((t) => t.code === tagCode);
    return topic?.title ?? tagCode;
  };

  const toggleSubject = (s: string) =>
    setExpandedSubjects((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  const toggleTag = (t: string) =>
    setExpandedTags((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });

  const questionsBySubjectAndTag = useMemo(() => {
    const grouped: Record<string, Record<string, QuestionBankQuestion[]>> = {};
    questions.forEach((q) => {
      const subject = getSubjectFromQuestion(q);
      const tag = q.primary_tag || "Untagged";
      if (!grouped[subject]) grouped[subject] = {};
      if (!grouped[subject][tag]) grouped[subject][tag] = [];
      grouped[subject][tag].push(q);
    });
    Object.keys(grouped).forEach((s) =>
      Object.keys(grouped[s]).forEach((t) =>
        grouped[s][t].sort((a, b) =>
          (a.generation_id || a.id).localeCompare(b.generation_id || b.id),
        ),
      ),
    );
    const sortedSubjects = Object.keys(grouped).sort((a, b) => {
      const isMathA = a === "Math 1" || a === "Math 2";
      const isMathB = b === "Math 1" || b === "Math 2";
      if (isMathA && !isMathB) return 1;
      if (!isMathA && isMathB) return -1;
      return a.localeCompare(b);
    });
    return { grouped, sortedSubjects };
  }, [questions]);

  return (
    <section className="flex h-full flex-col rounded-organic-xl bg-surface px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-xl font-bold leading-none tracking-tight text-text sm:text-[1.35rem]">
            Question Library
          </h2>
          <span className="shrink-0 font-heading text-xs font-medium leading-none tabular-nums text-text-muted">
            {questions.length} result{questions.length === 1 ? "" : "s"}
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

      {questions.length === 0 ? (
        <div className="mt-5 flex min-h-[14rem] flex-1 items-center justify-center rounded-organic-md bg-surface-mid/35 px-4 text-sm text-text-muted">
          No questions match the current filters.
        </div>
      ) : (
        <div className="mt-5 space-y-4 border-t border-border-subtle/40 pt-5">
          {questionsBySubjectAndTag.sortedSubjects.map((subject) => {
            const subjectTags = questionsBySubjectAndTag.grouped[subject];
            if (!subjectTags || !Object.keys(subjectTags).length) return null;

            const accentClass = getSubjectAccentTextClass(subject);
            const isExpanded = expandedSubjects.has(subject);
            const totalQ = Object.values(subjectTags).reduce((s, arr) => s + arr.length, 0);

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
                    {totalQ} question{totalQ === 1 ? "" : "s"}
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
                        {Object.keys(subjectTags)
                          .sort()
                          .map((primaryTag) => {
                            const tagQuestions = subjectTags[primaryTag];
                            if (!tagQuestions?.length) return null;

                            const tagKey = `${subject}-${primaryTag}`;
                            const isTagExpanded = expandedTags.has(tagKey);

                            return (
                              <div
                                key={tagKey}
                                className="overflow-hidden rounded-organic-md bg-surface-elevated"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleTag(tagKey)}
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
                                      {getTopicTitle(primaryTag)}
                                    </span>
                                  </div>
                                  <span className="shrink-0 font-heading text-xs tabular-nums text-text-muted">
                                    {tagQuestions.length}
                                  </span>
                                </button>

                                <AnimatePresence initial={false}>
                                  {isTagExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-1.5 border-t border-border-subtle/40 p-2">
                                        {tagQuestions.map((question, index) => {
                                          const isSelected = selectedQuestionIds.has(
                                            question.id,
                                          );
                                          const hasAttempted = attemptedQuestionIds.has(
                                            question.id,
                                          );
                                          const questionId =
                                            question.generation_id || question.id;

                                          return (
                                            <button
                                              key={question.id}
                                              type="button"
                                              onClick={() => onToggleQuestion(question.id)}
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
                                                  isSelected
                                                    ? "bg-secondary text-background"
                                                    : "bg-surface-elevated",
                                                )}
                                              >
                                                {isSelected ? (
                                                  <Check
                                                    className="h-3 w-3 stroke-[3]"
                                                    aria-hidden
                                                  />
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
                                                      getDifficultyBadgeClass(
                                                        question.difficulty,
                                                      ),
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
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
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
