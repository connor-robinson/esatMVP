"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QuestionBankEsatSessionShell } from "@/components/questionBank/QuestionBankEsatSessionShell";
import { QuestionDetailsPanel } from "@/components/admin/QuestionDetailsPanel";
import {
  REPORT_THANK_YOU_BODY,
  REPORT_THANK_YOU_SUBJECT,
  type ReportedQuestionItem,
} from "@/lib/admin/reportedQuestions";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";

type SaveToast = { id: number; message: string; kind: "ok" | "err" };

function optionLetters(question: QuestionBankQuestion): string[] {
  return Object.keys(question.options ?? {}).sort();
}

export default function AdminReportedQuestionsPage() {
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReportedQuestionItem[]>([]);
  const [index, setIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftStem, setDraftStem] = useState("");
  const [draftOptions, setDraftOptions] = useState<Record<string, string>>({});
  const [draftCorrect, setDraftCorrect] = useState("A");
  const [draftSolution, setDraftSolution] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [toasts, setToasts] = useState<SaveToast[]>([]);
  const saveTimer = useRef<number | null>(null);
  const toastId = useRef(0);
  const skipNextAutosave = useRef(false);

  const pushToast = useCallback((message: string, kind: "ok" | "err" = "ok") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/question-bank/reports", {
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load");
      setLoading(false);
      return;
    }
    const next = (json.items ?? []) as ReportedQuestionItem[];
    setItems(next);
    setIndex(0);
    setEditing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = items[index] ?? null;
  const questions = useMemo(() => items.map((i) => i.question), [items]);

  useEffect(() => {
    if (!current) return;
    skipNextAutosave.current = true;
    setDraftStem(current.question.question_stem ?? "");
    setDraftOptions({ ...(current.question.options ?? {}) });
    setDraftCorrect(current.question.correct_option || "A");
    setDraftSolution(current.question.solution_reasoning ?? "");
    setShowExplanation(false);
    setShowHint(false);
    setActionMsg(null);
  }, [current?.meta.ticketId, current?.question.id]);

  const persistQuestion = useCallback(
    async (questionId: string, patch: Record<string, unknown>) => {
      const res = await fetch(
        `/api/admin/question-bank/questions/${questionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Save failed",
        );
      }
      const updated = json.question as QuestionBankQuestion;
      setItems((prev) =>
        prev.map((item) =>
          item.question.id === questionId
            ? {
                ...item,
                question: updated,
                meta: {
                  ...item.meta,
                  db: {
                    ...item.meta.db,
                    status: updated.status,
                    correctOption: updated.correct_option,
                    difficulty: updated.difficulty,
                  },
                },
              }
            : item,
        ),
      );
      return updated;
    },
    [],
  );

  const scheduleAutosave = useCallback(() => {
    if (!current || !editing) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const questionId = current.question.id;
    const payload = {
      question_stem: draftStem,
      options: draftOptions,
      correct_option: draftCorrect,
      solution_reasoning: draftSolution,
    };
    saveTimer.current = window.setTimeout(() => {
      void persistQuestion(questionId, payload)
        .then(() => pushToast("Saved", "ok"))
        .catch((err) =>
          pushToast(
            err instanceof Error ? err.message : "Save failed",
            "err",
          ),
        );
    }, 700);
  }, [
    current,
    editing,
    draftStem,
    draftOptions,
    draftCorrect,
    draftSolution,
    persistQuestion,
    pushToast,
  ]);

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [scheduleAutosave]);

  const removeCurrentFromQueue = useCallback(() => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
    setEditing(false);
  }, [index]);

  const resolveTicket = async (ticketId: string) => {
    const res = await fetch("/api/admin/support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "support",
        id: ticketId,
        status: "resolved",
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(
        typeof json.error === "string" ? json.error : "Could not resolve ticket",
      );
    }
  };

  const sendThankYou = async () => {
    if (!current?.meta.userId) {
      setActionMsg("No linked user account to message.");
      return;
    }
    setBusy("send");
    setActionMsg(null);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "support",
          id: current.meta.ticketId,
          subject: REPORT_THANK_YOU_SUBJECT,
          body: REPORT_THANK_YOU_BODY,
          markResolved: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Send failed",
        );
      }
      setActionMsg("Thank-you sent and ticket resolved.");
      pushToast("Message sent", "ok");
      removeCurrentFromQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  };

  const approveQuestion = async () => {
    if (!current) return;
    setBusy("approve");
    setActionMsg(null);
    try {
      await persistQuestion(current.question.id, { status: "approved" });
      await resolveTicket(current.meta.ticketId);
      setActionMsg("Approved and ticket resolved.");
      pushToast("Approved", "ok");
      removeCurrentFromQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteQuestion = async () => {
    if (!current) return;
    const ok = window.confirm(
      "Soft-delete this question in Supabase (status=deleted) and resolve the report?",
    );
    if (!ok) return;
    setBusy("delete");
    setActionMsg(null);
    try {
      await persistQuestion(current.question.id, { status: "deleted" });
      await resolveTicket(current.meta.ticketId);
      setActionMsg("Question deleted and ticket resolved.");
      pushToast("Deleted", "ok");
      removeCurrentFromQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  if (forbidden) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted">
        Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted">
        Loading reported questions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm text-text underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-text">Reported questions</h1>
        <p className="mt-3 text-sm text-text-muted">
          No open question-bank reports right now. Fresh reports from the in-session
          Report control show up here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/admin/question-bank" className="underline text-text-muted">
            Question bank stats
          </Link>
          <Link href="/admin/support" className="underline text-text-muted">
            Support inbox
          </Link>
        </div>
      </div>
    );
  }

  const displayQuestion: QuestionBankQuestion = editing
    ? {
        ...current.question,
        question_stem: draftStem,
        options: draftOptions,
        correct_option: draftCorrect,
        solution_reasoning: draftSolution,
      }
    : current.question;

  return (
    <div className="relative min-h-screen bg-surface">
      <div className="sticky top-0 z-40 border-b border-amber-500/25 bg-amber-50/95 px-4 py-3 backdrop-blur dark:bg-amber-950/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80 dark:text-amber-200/80">
              Reported questions · {index + 1} of {items.length} ·{" "}
              {current.meta.reason}
            </p>
            <p className="mt-1 text-sm font-medium text-text">
              AI question bank · {current.meta.db.subjects} ·{" "}
              {current.meta.topicLabel}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {current.meta.sessionNote}
            </p>
            {actionMsg ? (
              <p className="mt-2 text-sm text-text-muted">{actionMsg}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/admin/question-bank"
              className="text-text-muted underline-offset-2 hover:underline"
            >
              Stats
            </Link>
            <Link
              href="/admin/support"
              className="text-text-muted underline-offset-2 hover:underline"
            >
              Support
            </Link>
          </div>
        </div>
      </div>

      <QuestionBankEsatSessionShell
        question={displayQuestion}
        questions={
          questions.length > 0
            ? questions.map((q, i) =>
                i === index ? displayQuestion : q,
              )
            : [displayQuestion]
        }
        currentIndex={index}
        attemptLog={[]}
        remainingTimeMs={null}
        timerLabel="--"
        reviewMode
        currentSelection={displayQuestion.correct_option}
        incorrectAnswers={new Set()}
        isAnswered
        isCorrect
        answerRevealed
        showLeaveConfirm={false}
        flaggedIds={new Set()}
        onToggleFlag={() => {}}
        onSelectionChange={() => {}}
        onSubmitAnswer={() => {}}
        onRevealAnswer={() => {}}
        onShowExplanation={() => setShowExplanation(true)}
        onShowHint={() => setShowHint(true)}
        hasHint={Boolean(displayQuestion.solution_key_insight)}
        showHint={showHint}
        hintContent={displayQuestion.solution_key_insight}
        onCloseHint={() => setShowHint(false)}
        onNext={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
        onPrevious={() => setIndex((i) => Math.max(0, i - 1))}
        onJumpTo={(i) => setIndex(i)}
        onOpenLeaveConfirm={() => {}}
        onCloseLeaveConfirm={() => {}}
        onSaveAndLeave={() => {}}
        onDiscardSession={() => {}}
        onUseClassicUi={() => {}}
        showExplanation={showExplanation}
        explanationContent={displayQuestion.solution_reasoning}
        onCloseExplanation={() => setShowExplanation(false)}
        sessionId={current.meta.sessionId}
        belowQuestion={
          <div className="space-y-4">
            <QuestionDetailsPanel
              meta={current.meta}
              question={displayQuestion}
            />

            <section className="rounded-organic-xl border border-border-subtle bg-surface-elevated px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                Review actions
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void approveQuestion()}
                  className="rounded-organic-md bg-secondary/30 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
                >
                  {busy === "approve" ? "Approving…" : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    setEditing((v) => !v);
                    setActionMsg(null);
                  }}
                  className={cn(
                    "rounded-organic-md px-3 py-2 text-sm font-semibold",
                    editing
                      ? "bg-secondary/25 text-text"
                      : "bg-surface-mid text-text",
                  )}
                >
                  {editing ? "Done editing" : "Edit"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void deleteQuestion()}
                  className="rounded-organic-md bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-300 disabled:opacity-50"
                >
                  {busy === "delete" ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(busy) || !current.meta.userId}
                  onClick={() => void sendThankYou()}
                  className="rounded-organic-md bg-[#2E79B5]/20 px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
                  title={
                    current.meta.userId
                      ? "Send the prefilled thank-you and resolve"
                      : "No linked account"
                  }
                >
                  {busy === "send" ? "Sending…" : "Send thank-you"}
                </button>
              </div>

              <div className="mt-4 rounded-organic-md border border-border-subtle bg-surface-mid/40 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Prefill reply · {REPORT_THANK_YOU_SUBJECT}
                </p>
                <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-text-muted">
                  {REPORT_THANK_YOU_BODY}
                </pre>
              </div>

              {editing ? (
                <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
                  <p className="text-xs text-text-subtle">
                    Edits autosave to Supabase in the background. A small notice
                    appears when saved; you can keep working.
                  </p>
                  <label className="block text-xs font-medium text-text-muted">
                    Stem
                    <textarea
                      value={draftStem}
                      onChange={(e) => setDraftStem(e.target.value)}
                      rows={8}
                      className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 font-mono text-sm text-text"
                    />
                  </label>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-text-muted">
                      Options
                    </p>
                    {optionLetters(displayQuestion).map((letter) => (
                      <label
                        key={letter}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="mt-2 w-6 font-semibold text-text">
                          {letter}
                        </span>
                        <textarea
                          value={draftOptions[letter] ?? ""}
                          onChange={(e) =>
                            setDraftOptions((prev) => ({
                              ...prev,
                              [letter]: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 font-mono text-sm text-text"
                        />
                      </label>
                    ))}
                  </div>
                  <label className="block text-xs font-medium text-text-muted">
                    Correct option
                    <select
                      value={draftCorrect}
                      onChange={(e) => setDraftCorrect(e.target.value)}
                      className="mt-1.5 rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm text-text"
                    >
                      {optionLetters(displayQuestion).map((letter) => (
                        <option key={letter} value={letter}>
                          {letter}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-text-muted">
                    Solution
                    <textarea
                      value={draftSolution}
                      onChange={(e) => setDraftSolution(e.target.value)}
                      rows={8}
                      className="mt-1.5 w-full rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 font-mono text-sm text-text"
                    />
                  </label>
                </div>
              ) : null}
            </section>
          </div>
        }
      />

      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-organic-md px-3 py-2 text-sm font-medium shadow-lg",
              toast.kind === "ok"
                ? "bg-surface-elevated text-text ring-1 ring-border-subtle"
                : "bg-red-600 text-white",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
