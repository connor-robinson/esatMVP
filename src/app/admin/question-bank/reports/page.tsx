"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionBankEsatSessionShell } from "@/components/questionBank/QuestionBankEsatSessionShell";
import { QuestionDetailsPanel } from "@/components/admin/QuestionDetailsPanel";
import {
  REPORT_THANK_YOU_SUBJECT,
  buildReportThankYouBody,
  type ReportedQuestionItem,
} from "@/lib/admin/reportedQuestions";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { cn } from "@/lib/utils";

type SaveToast = { id: number; message: string; kind: "ok" | "err" };

function optionLetters(question: QuestionBankQuestion): string[] {
  return Object.keys(question.options ?? {}).sort();
}

function reporterLabel(meta: ReportedQuestionItem["meta"]): string {
  if (meta.username && meta.email) return `${meta.username} (${meta.email})`;
  return meta.username || meta.email || "Unknown user";
}

export default function AdminReportedQuestionsPage() {
  const router = useRouter();
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
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [thankYouDraft, setThankYouDraft] = useState("");
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
    setThankYouOpen(false);
    setThankYouDraft("");
  }, [current?.meta.ticketId, current?.question.id]);

  const openThankYou = useCallback(() => {
    if (!current) return;
    setActionMsg(null);
    setThankYouDraft(buildReportThankYouBody(current.meta.username));
    setThankYouOpen(true);
  }, [current]);

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

  const markTicketResolvedLocally = useCallback((ticketId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.meta.ticketId === ticketId
          ? {
              ...item,
              meta: { ...item.meta, ticketStatus: "resolved" },
            }
          : item,
      ),
    );
  }, []);

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
    markTicketResolvedLocally(ticketId);
  };

  const sendThankYou = async () => {
    if (!current?.meta.userId) {
      setActionMsg("No linked user account to message.");
      return;
    }
    const body = thankYouDraft.trim();
    if (!body) {
      setActionMsg("Thank-you message cannot be empty.");
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
          body,
          markResolved: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.error === "string" ? json.error : "Send failed",
        );
      }
      markTicketResolvedLocally(current.meta.ticketId);
      setThankYouOpen(false);
      setActionMsg("Thank-you sent and ticket resolved. Question stays in this review session.");
      pushToast("Message sent", "ok");
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(null);
    }
  };

  const questionStatus = current?.meta.db.status ?? current?.question.status ?? "pending";
  const isApproved = questionStatus === "approved";
  const isDeleted = questionStatus === "deleted";

  const approveQuestion = async () => {
    if (!current) return;
    const nextStatus = isApproved ? "pending" : "approved";
    setBusy(nextStatus === "approved" ? "approve" : "unapprove");
    setActionMsg(null);
    try {
      await persistQuestion(current.question.id, { status: nextStatus });
      if (nextStatus === "approved") {
        await resolveTicket(current.meta.ticketId);
        setActionMsg("Approved and ticket resolved.");
        pushToast("Approved", "ok");
      } else {
        setActionMsg("Unapproved (status set to pending).");
        pushToast("Unapproved", "ok");
      }
    } catch (err) {
      setActionMsg(
        err instanceof Error
          ? err.message
          : nextStatus === "approved"
            ? "Approve failed"
            : "Unapprove failed",
      );
    } finally {
      setBusy(null);
    }
  };

  const deleteQuestion = async () => {
    if (!current) return;
    const nextStatus = isDeleted ? "pending" : "deleted";
    if (nextStatus === "deleted") {
      const ok = window.confirm(
        "Soft-delete this question in Supabase (status=deleted) and resolve the report?",
      );
      if (!ok) return;
    }
    setBusy(nextStatus === "deleted" ? "delete" : "undelete");
    setActionMsg(null);
    try {
      await persistQuestion(current.question.id, { status: nextStatus });
      if (nextStatus === "deleted") {
        await resolveTicket(current.meta.ticketId);
        setActionMsg("Question deleted and ticket resolved.");
        pushToast("Deleted", "ok");
      } else {
        setActionMsg("Undeleted (status set to pending).");
        pushToast("Undeleted", "ok");
      }
    } catch (err) {
      setActionMsg(
        err instanceof Error
          ? err.message
          : nextStatus === "deleted"
            ? "Delete failed"
            : "Undelete failed",
      );
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
              Reported by {reporterLabel(current.meta)}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              Status: {questionStatus}
              {" · "}
              Ticket: {current.meta.ticketStatus}
              {" · "}
              AI question bank · {current.meta.db.subjects} ·{" "}
              {current.meta.topicLabel}
              {current.meta.sessionNote
                ? ` · ${current.meta.sessionNote}`
                : ""}
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
        onOpenLeaveConfirm={() => router.push("/admin/question-bank")}
        onCloseLeaveConfirm={() => {}}
        onSaveAndLeave={() => {}}
        onDiscardSession={() => {}}
        onUseClassicUi={() => {}}
        showExplanation={showExplanation}
        explanationContent={displayQuestion.solution_reasoning}
        onCloseExplanation={() => setShowExplanation(false)}
        sessionId={current.meta.sessionId}
        hideSupportControl
        footerExtra={
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void approveQuestion()}
              className="eup-footer-action text-sm font-semibold disabled:opacity-50"
            >
              {busy === "approve"
                ? "Approving…"
                : busy === "unapprove"
                  ? "Unapproving…"
                  : isApproved
                    ? "Unapprove"
                    : "Approve"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                setEditing((v) => !v);
                setActionMsg(null);
              }}
              className={cn(
                "eup-footer-action text-sm font-semibold",
                editing && "opacity-100",
              )}
            >
              {editing ? "Done editing" : "Edit"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void deleteQuestion()}
              className={cn(
                "eup-footer-action text-sm font-semibold disabled:opacity-50",
                !isDeleted && "text-red-700 dark:text-red-300",
              )}
            >
              {busy === "delete"
                ? "Deleting…"
                : busy === "undelete"
                  ? "Undeleting…"
                  : isDeleted
                    ? "Undelete"
                    : "Delete"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !current.meta.userId}
              onClick={openThankYou}
              className="eup-footer-action text-sm font-semibold disabled:opacity-50"
              title={
                current.meta.userId
                  ? "Edit and send thank-you"
                  : "No linked account"
              }
            >
              Send thank-you
            </button>
          </div>
        }
        belowQuestion={
          <div className="space-y-4">
            <QuestionDetailsPanel
              meta={current.meta}
              question={displayQuestion}
            />

            {editing ? (
              <section className="rounded-organic-xl border border-border-subtle bg-surface-elevated px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Edit question
                </p>
                <p className="mt-2 text-xs text-text-subtle">
                  Edits autosave to Supabase in the background. A small notice
                  appears when saved; you can keep working.
                </p>
                <div className="mt-4 space-y-4">
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
              </section>
            ) : null}
          </div>
        }
      />

      {thankYouOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="thank-you-title"
          onClick={() => {
            if (!busy) setThankYouOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-organic-xl border border-border-subtle bg-surface-elevated p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="thank-you-title"
              className="text-lg font-semibold text-text"
            >
              Send thank-you
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              To {reporterLabel(current.meta)} · {REPORT_THANK_YOU_SUBJECT}
            </p>
            <label className="mt-4 block text-xs font-medium text-text-muted">
              Message
              <textarea
                value={thankYouDraft}
                onChange={(e) => setThankYouDraft(e.target.value)}
                rows={8}
                disabled={Boolean(busy)}
                className="mt-1.5 w-full resize-y rounded-organic-md border border-border-subtle bg-surface-mid px-3 py-2 text-sm leading-relaxed text-text disabled:opacity-50"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setThankYouOpen(false)}
                className="rounded-organic-md bg-surface-mid px-3 py-2 text-sm font-semibold text-text disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  Boolean(busy) ||
                  !current.meta.userId ||
                  !thankYouDraft.trim()
                }
                onClick={() => void sendThankYou()}
                className="rounded-organic-md bg-[#2E79B5] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "send" ? "Sending…" : "Send & resolve"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
