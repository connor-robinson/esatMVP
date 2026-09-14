"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFermiNumber, formatFullNumber } from "@/lib/fermi/parseNumber";
import { FERMI_GUESSR_NAME } from "@/config/fermiGuessr";
import type { FermiBatchQuestion } from "@/lib/fermi/batchQuestion";

type DayIndex = {
  date: string;
  editionTitle: string | null;
  questionCount: number;
  factCount: number;
};

type IndexPayload = {
  meta: {
    startDate?: string;
    endDate?: string;
    model?: string;
  };
  dayCount: number;
  questionCount: number;
  days: DayIndex[];
};

type DayPayload = {
  date: string;
  editionTitle: string | null;
  questions: FermiBatchQuestion[];
};

export function FermiPreviewClient({ batchId }: { batchId: "01" | "02" }) {
  const [index, setIndex] = useState<IndexPayload | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [day, setDay] = useState<DayPayload | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      setLoadingIndex(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/fermi-preview?batch=${batchId}&index=1`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as IndexPayload & { error?: string };
        if (!res.ok) throw new Error(json.error || "Failed to load batch index");
        if (cancelled) return;
        setIndex(json);
        setDayIndex(0);
        setQIndex(0);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoadingIndex(false);
      }
    }
    void loadIndex();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  const selectedDate = index?.days[dayIndex]?.date ?? null;

  useEffect(() => {
    if (!selectedDate) {
      setDay(null);
      return;
    }
    let cancelled = false;
    async function loadDay() {
      setLoadingDay(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/fermi-preview?batch=${batchId}&date=${selectedDate}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as {
          day?: DayPayload;
          error?: string;
        };
        if (!res.ok || !json.day) {
          throw new Error(json.error || "Failed to load day");
        }
        if (cancelled) return;
        setDay(json.day);
        setQIndex(0);
        setShowSolution(true);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoadingDay(false);
      }
    }
    void loadDay();
    return () => {
      cancelled = true;
    };
  }, [batchId, selectedDate]);

  const question = day?.questions[qIndex] ?? null;

  const progress = useMemo(() => {
    if (!day?.questions.length) return 0;
    return ((qIndex + 1) / day.questions.length) * 100;
  }, [day, qIndex]);

  const goDay = useCallback(
    (next: number) => {
      if (!index) return;
      if (next < 0 || next >= index.days.length) return;
      setDayIndex(next);
    },
    [index],
  );

  const goQuestion = useCallback(
    (next: number) => {
      if (!day) return;
      if (next < 0 || next >= day.questions.length) return;
      setQIndex(next);
      setShowSolution(true);
    },
    [day],
  );

  if (loadingIndex) {
    return (
      <div className="flex h-[calc(100vh-58px)] items-center justify-center bg-background">
        <p className="text-sm font-medium text-text-muted">Loading preview…</p>
      </div>
    );
  }

  if (error && !day) {
    return (
      <div className="flex h-[calc(100vh-58px)] flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-medium text-text-muted">{error}</p>
        <Link
          href="/mental-maths/fermiguessr"
          className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
        >
          Back to game
        </Link>
      </div>
    );
  }

  if (!index || !index.days.length) {
    return (
      <div className="flex h-[calc(100vh-58px)] items-center justify-center bg-background">
        <p className="text-sm font-medium text-text-muted">No questions in this batch.</p>
      </div>
    );
  }

  const edition =
    day?.editionTitle || index.days[dayIndex]?.editionTitle || null;

  const solution =
    question?.sourceNote?.trim() ||
    (question
      ? `Answer ≈ ${formatFermiNumber(question.answer)}${question.unit ? ` ${question.unit}` : ""}`
      : "");

  return (
    <div className="relative flex h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 shrink-0">
          <h1 className="truncate text-sm font-bold leading-none text-text sm:text-base">
            {FERMI_GUESSR_NAME} preview
          </h1>
          <p className="mt-1 text-xs font-medium text-text-muted">
            Batch {batchId} · {index.questionCount} Qs · {index.dayCount} days
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
            {day ? `${qIndex + 1}/${day.questions.length}` : "–"}
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
          <p className="text-sm font-bold tabular-nums text-text">{selectedDate}</p>
          {edition ? (
            <p className="truncate text-xs font-medium text-secondary">{edition}</p>
          ) : (
            <p className="text-xs text-text-muted">
              Day {dayIndex + 1} of {index.days.length}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => goDay(Math.min(index.days.length - 1, dayIndex + 1))}
          disabled={dayIndex >= index.days.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text disabled:opacity-40"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
        {index.days.map((d, i) => (
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
        {loadingDay || !question || !day ? (
          <p className="text-sm font-medium text-text-muted">Loading day…</p>
        ) : (
          <div className="flex w-full max-w-3xl flex-col items-center gap-6">
            <h2 className="w-full max-w-3xl text-balance text-center font-serif text-2xl leading-snug text-text sm:text-3xl">
              {question.question}
            </h2>

            <div className="flex w-full max-w-xl flex-col gap-2">
              <div className="flex h-16 w-full items-center gap-2 rounded-sm bg-surface-elevated pl-5 pr-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Answer
                  </p>
                  <p className="truncate text-xl font-semibold text-text sm:text-2xl">
                    {formatFullNumber(question.answer)}
                    {question.unit ? ` ${question.unit}` : ""}
                    <span className="ml-2 text-sm font-medium text-text-muted">
                      ({formatFermiNumber(question.answer)})
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSolution((v) => !v)}
                    title={showSolution ? "Hide solution" : "View our solution"}
                    aria-label={showSolution ? "Hide solution" : "View our solution"}
                    className="inline-flex h-11 items-center justify-center rounded-sm bg-surface px-3 text-text-muted hover:bg-surface-mid hover:text-text"
                  >
                    <Eye className="h-5 w-5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (qIndex + 1 < day.questions.length) {
                        goQuestion(qIndex + 1);
                      } else if (dayIndex + 1 < index.days.length) {
                        goDay(dayIndex + 1);
                      }
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-sm bg-secondary px-3 text-white hover:brightness-110"
                    title="Next"
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {showSolution ? (
              <div className="w-full max-w-xl rounded-sm bg-surface-elevated px-4 py-3 text-left">
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Our solution
                </p>
                <p className="mt-1 text-sm leading-snug text-text">{solution}</p>
                <p className="mt-2 text-xs font-medium text-text-muted">
                  Answer: {formatFermiNumber(question.answer)}
                  {question.unit ? ` ${question.unit}` : ""}
                  {" · "}
                  {formatFullNumber(question.answer)}
                </p>
              </div>
            ) : null}

            {question.showDidYouKnow && question.didYouKnow ? (
              <div className="w-full max-w-xl rounded-sm bg-surface-elevated px-4 py-3 text-left">
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
        )}
      </div>
    </div>
  );
}
