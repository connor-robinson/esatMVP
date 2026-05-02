"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronDown, Check, CheckCircle2, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/shared/MathContent";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";

interface QuestionLibraryGridProps {
  questions: QuestionBankQuestion[];
  selectedQuestionIds: Set<string>;
  onToggleQuestion: (questionId: string) => void;
}

function getSubjectTextClass(subject: string): string {
  // Biology maps to yellowLight in theme — use accent (teal) to distinguish from warning/difficulty
  if (subject === "Biology") return "text-accent";
  if (subject === "Chemistry") return "text-chemistry";
  if (subject === "Physics") return "text-physics";
  if (subject === "Math 1" || subject === "Math 2") return "text-maths";
  return "text-text-muted";
}

function getDifficultyClass(difficulty: string): string {
  if (difficulty === "Easy") return "bg-primary/15 text-primary";
  if (difficulty === "Medium") return "bg-warning/15 text-warning";
  if (difficulty === "Hard") return "bg-error/15 text-error";
  return "bg-surface-neutral text-text-muted";
}

function getSubjectFromQuestion(question: QuestionBankQuestion): string {
  if (question.subjects) return question.subjects;
  if (question.schema_id?.startsWith("P")) return "Physics";
  if (question.schema_id?.startsWith("C")) return "Chemistry";
  if (question.schema_id?.startsWith("B")) return "Biology";
  if (question.schema_id?.startsWith("M")) return "Math 1";
  return "Unknown";
}

export function QuestionLibraryGrid({
  questions,
  selectedQuestionIds,
  onToggleQuestion,
}: QuestionLibraryGridProps) {
  const session = useSupabaseSession();

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [curriculum, setCurriculum] = useState<any>(null);
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
                  .filter((a: any) => questionIds.includes(a.question_id))
                  .map((a: any) => String(a.question_id))
              )
            );
          }
        })
        .catch(() => {});
    }
  }, [session?.user, questionIdsString]);

  const getTopicTitle = (tagCode: string): string => {
    if (!tagCode) return tagCode;
    const prefixes = ["Math 1", "Math 2", "Physics", "Chemistry", "Biology", "Paper 1", "Paper 2"];
    for (const p of prefixes) {
      if (new RegExp(`^${p}\\s*-\\s*`, "i").test(tagCode)) {
        return tagCode.replace(new RegExp(`^${p}\\s*-\\s*`, "i"), "").trim();
      }
    }
    if (!curriculum) return tagCode;
    let paperId = "";
    let cleanCode = "";
    if (tagCode.startsWith("M1-")) { paperId = "math1"; cleanCode = tagCode.replace("M1-", ""); }
    else if (tagCode.startsWith("M2-")) { paperId = "math2"; cleanCode = tagCode.replace("M2-", ""); }
    else if (tagCode.startsWith("P-")) { paperId = "physics"; cleanCode = tagCode.replace("P-", ""); }
    else if (tagCode.startsWith("biology-")) { paperId = "biology"; cleanCode = tagCode.replace("biology-", ""); }
    else if (tagCode.startsWith("chemistry-")) { paperId = "chemistry"; cleanCode = tagCode.replace("chemistry-", ""); }
    if (!paperId) {
      for (const paper of curriculum.papers ?? []) {
        const topic = paper.topics?.find((t: any) => t.code === tagCode || t.code === tagCode.replace(/^[A-Z]+/, ""));
        if (topic) return topic.title;
      }
      return tagCode;
    }
    const paper = curriculum.papers?.find((p: any) => p.paper_id === paperId);
    if (!paper) return tagCode;
    const topic = paper.topics?.find((t: any) => t.code === cleanCode)
      ?? paper.topics?.find((t: any) => t.code === cleanCode.replace(/^[A-Z]+/, ""))
      ?? paper.topics?.find((t: any) => t.code === tagCode);
    return topic?.title ?? tagCode;
  };

  const toggleSubject = (s: string) =>
    setExpandedSubjects((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const toggleTag = (t: string) =>
    setExpandedTags((prev) => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

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
        grouped[s][t].sort((a, b) => (a.generation_id || a.id).localeCompare(b.generation_id || b.id))
      )
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
    <div className="flex h-full flex-col rounded-2xl border border-border-subtle bg-surface px-5 py-5">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-text">Question Library</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Browse questions and add them to your practice session.
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-xs text-text-muted">
          {questions.length} result{questions.length === 1 ? "" : "s"}
        </span>
      </div>

      {questions.length === 0 ? (
        <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle bg-surface-mid py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border-subtle bg-surface">
            <BookOpen className="h-7 w-7 text-text-muted" strokeWidth={1.5} />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-text">No questions found</p>
            <p className="text-xs text-text-muted">Try adjusting your filters</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {questionsBySubjectAndTag.sortedSubjects.map((subject) => {
            const subjectTags = questionsBySubjectAndTag.grouped[subject];
            if (!subjectTags || !Object.keys(subjectTags).length) return null;

            const accentClass = getSubjectTextClass(subject);
            const isExpanded = expandedSubjects.has(subject);
            const totalQ = Object.values(subjectTags).reduce((s, arr) => s + arr.length, 0);

            return (
              <div
                key={subject}
                className="overflow-hidden rounded-xl border border-border-subtle bg-surface-mid"
              >
                {/* Subject header */}
                <button
                  type="button"
                  onClick={() => toggleSubject(subject)}
                  className="group flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-surface-neutral"
                >
                  <div className="flex items-center gap-2.5">
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 transition-transform duration-200", accentClass, !isExpanded && "-rotate-90")}
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className={cn("text-sm font-semibold uppercase tracking-wide", accentClass)}>
                      {subject} Questions
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {totalQ} question{totalQ === 1 ? "" : "s"}
                  </span>
                </button>

                {/* Tags inside subject */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 border-t border-border-subtle p-3">
                        {Object.keys(subjectTags)
                          .sort()
                          .map((primaryTag) => {
                            const tagQuestions = subjectTags[primaryTag];
                            if (!tagQuestions?.length) return null;

                            const tagKey = `${subject}-${primaryTag}`;
                            const isTagExpanded = expandedTags.has(tagKey);

                            return (
                              <div key={tagKey} className="overflow-hidden rounded-lg border border-border-subtle bg-surface">
                                {/* Tag header */}
                                <button
                                  type="button"
                                  onClick={() => toggleTag(tagKey)}
                                  className="group flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-surface-subtle"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <ChevronDown
                                      className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", accentClass, !isTagExpanded && "-rotate-90")}
                                      strokeWidth={2.5}
                                      aria-hidden
                                    />
                                    <span className="truncate text-sm text-text-muted">
                                      {getTopicTitle(primaryTag)}
                                    </span>
                                  </div>
                                  <span className="shrink-0 pl-3 text-xs text-text-muted">
                                    {tagQuestions.length}
                                  </span>
                                </button>

                                {/* Questions list */}
                                <AnimatePresence initial={false}>
                                  {isTagExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="space-y-1.5 border-t border-border-subtle p-2.5">
                                        {tagQuestions.map((question, index) => {
                                          const isSelected = selectedQuestionIds.has(question.id);
                                          const hasAttempted = attemptedQuestionIds.has(question.id);

                                          return (
                                            <button
                                              key={question.id}
                                              type="button"
                                              onClick={() => onToggleQuestion(question.id)}
                                              className={cn(
                                                "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                                                isSelected
                                                  ? "bg-accent/10 border border-accent/25"
                                                  : "border border-transparent bg-surface-mid hover:bg-surface-neutral"
                                              )}
                                            >
                                              {/* Checkbox */}
                                              <div
                                                className={cn(
                                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                                                  isSelected
                                                    ? "border-accent bg-accent"
                                                    : "border-border bg-surface"
                                                )}
                                              >
                                                {isSelected && <Check className="h-3 w-3 text-background" strokeWidth={3} />}
                                              </div>

                                              <div className="min-w-0 flex-1 space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="text-xs font-semibold text-text">
                                                    Question {index + 1}
                                                  </span>
                                                  {hasAttempted && (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
                                                  )}
                                                  <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", getDifficultyClass(question.difficulty))}>
                                                    {question.difficulty}
                                                  </span>
                                                </div>
                                                <div className="line-clamp-2 text-sm text-text-muted">
                                                  <MathContent content={question.question_stem} className="text-inherit" />
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
    </div>
  );
}
