"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFermiNumber, formatFullNumber } from "@/lib/fermi/parseNumber";
import { FERMI_GUESSR_NAME } from "@/config/fermiGuessr";
import type { FermiPreviewPayload } from "@/lib/fermi/loadBatchFile";

function formatAnswer(n: number, unit?: string): string {
  const formatted = formatFermiNumber(n);
  const full = formatFullNumber(n);
  const withUnit = unit ? `${full} ${unit}` : full;
  return `${withUnit} (${formatted})`;
}

export function FermiPreviewClient({
  initial,
  batchId,
}: {
  initial: FermiPreviewPayload;
  batchId: "01" | "02";
}) {
  const [dayIndex, setDayIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState(true);

  const day = initial.days[dayIndex] ?? null;
  const question = day?.questions[qIndex] ?? null;

  const progress = useMemo(() => {
    if (!day) return 0;
    return ((qIndex + (revealed ? 1 : 0)) / day.questions.length) * 100;
  }, [day, qIndex, revealed]);

  const goDay = (next: number) => {
    setDayIndex(next);
    setQIndex(0);
    setRevealed(true);
  };

  const goQuestion = (next: number) => {
    if (!day) return;
    if (next < 0 || next >= day.questions.length) return;
    setQIndex(next);
    setRevealed(true);
  };

  if (!day || !question) {
    return (
      <div className="flex h-[calc(100vh-58px)] items-center justify-center bg-background">
        <p className="text-sm font-medium text-text-muted">No questions in this batch.</p>
      </div>
    );
  }

  const edition =
    day.editionTitle ||
    (question.themeHook ? question.themeHook : null);

  return (
    <div className="relative flex h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 shrink-0">
          <h1 className="truncate text-sm font-bold leading-none text-text sm:text-base">
            {FERMI_GUESSR_NAME} preview
          </h1>
          <p className="mt-1 text-xs font-medium text-text-muted">
            Batch {batchId} · {initial.questionCount} Qs · {initial.dayCount} days
          </p>
        </div>

        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface">
          <div
            className="h-full rounded-sm bg-secondary transition-all duration-normal ease-signature"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-text-muted sm:text-sm">
            {qIndex + 1}/{day.questions.length}
          </span>
          <Link
            href="/mental-maths/fermiguessr"
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text-muted outline-none transition-colors hover:bg-surface-mid hover:text-text"
            title="Open live game"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </Link>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={() => goDay(Math.max(0, dayIndex - 1))}
          disabled={dayIndex === 0}
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text disabled:opacity-40"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-bold tabular-nums text-text">{day.date}</p>
          {edition ? (
            <p className="truncate text-xs font-medium text-secondary">{edition}</p>
          ) : (
            <p className="text-xs text-text-muted">
              Day {dayIndex + 1} of {initial.days.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => goDay(Math.min(initial.days.length - 1, dayIndex + 1))}
          disabled={dayIndex >= initial.days.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text disabled:opacity-40"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
        {initial.days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            onClick={() => goDay(i)}
            className={cn(
              "shrink-0 rounded-sm px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
              i === dayIndex
                ? "bg-secondary text-white"
                : "bg-surface text-text-muted hover:bg-surface-mid hover:text-text",
            )}
          >
            {d.date.slice(5)}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-4 sm:px-6 sm:pt-10">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <div className="flex w-full max-w-xl items-center justify-center gap-3 sm:gap-5">
            <h2 className="-translate-x-1 text-balance text-center font-serif text-2xl leading-snug text-text sm:-translate-x-3 sm:text-3xl">
              {question.question}
            </h2>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="flex min-h-[2.5rem] items-center justify-center rounded-sm bg-primary/10 px-3 py-2 text-center text-primary">
              <span className="text-sm font-semibold">
                {question.category.replace(/_/g, " ")} · {question.difficulty}
                {question.exact ? " · exact" : ""}
              </span>
            </div>

            {revealed ? (
              <div className="flex min-h-16 w-full flex-col justify-center rounded-sm bg-surface-elevated px-5 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Answer
                </p>
                <p className="text-xl font-semibold text-text sm:text-2xl">
                  {formatAnswer(question.answer, question.unit)}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex h-16 w-full items-center justify-center rounded-sm bg-secondary text-base font-bold text-white"
              >
                Reveal answer
              </button>
            )}
          </div>

          {revealed && question.showDidYouKnow && question.didYouKnow ? (
            <div className="w-full max-w-md rounded-sm bg-surface-elevated px-4 py-3 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                Did you know?
              </p>
              <p className="mt-1 text-sm leading-snug text-text">
                {question.didYouKnow}
              </p>
              {question.factSourceUrl ? (
                <a
                  href={question.factSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {question.factSourceLabel || "Source"}
                </a>
              ) : null}
            </div>
          ) : null}

          {revealed && question.sourceNote && !question.showDidYouKnow ? (
            <p className="max-w-md text-center text-sm font-medium leading-snug text-text-muted">
              {question.sourceNote}
            </p>
          ) : null}

          <div className="flex w-full max-w-xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goQuestion(qIndex - 1)}
              disabled={qIndex === 0}
              className="flex items-center gap-2 rounded-sm bg-surface px-4 py-2.5 text-sm font-bold text-text disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                if (qIndex + 1 < day.questions.length) {
                  goQuestion(qIndex + 1);
                } else if (dayIndex + 1 < initial.days.length) {
                  goDay(dayIndex + 1);
                }
              }}
              disabled={
                qIndex + 1 >= day.questions.length &&
                dayIndex + 1 >= initial.days.length
              }
              className="flex items-center gap-2 rounded-sm bg-secondary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {qIndex + 1 < day.questions.length
                ? "Next question"
                : dayIndex + 1 < initial.days.length
                  ? "Next day"
                  : "Done"}
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex gap-2">
            {day.questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => goQuestion(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-sm text-xs font-bold",
                  i === qIndex
                    ? "bg-secondary text-white"
                    : q.showDidYouKnow
                      ? "bg-secondary/20 text-secondary"
                      : "bg-surface text-text-muted",
                )}
                title={q.showDidYouKnow ? "Has Did you know" : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
