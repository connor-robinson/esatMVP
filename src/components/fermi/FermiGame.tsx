/**
 * Fermi Estimation — daily mental-maths minigame.
 *
 * Everyone gets the same five questions each UTC day. Questions cycle through
 * the bank without repeating until the pool is exhausted, then restart.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FermiQuestion } from "@/config/fermiQuestions";
import {
  formatFermiNumber,
  formatFullNumber,
  parseFermiInput,
} from "@/lib/fermi/parseNumber";
import {
  closenessScore,
  getVerdict,
  logError,
  type FermiVerdict,
} from "@/lib/fermi/scoring";
import { utcDateKey } from "@/lib/fermi/dates";
import {
  FERMI_DAILY_ROUND_SIZE,
  getDailyFermiQuestions,
  getDailyPuzzleNumber,
} from "@/lib/fermi/dailyQuestions";

const BEST_SCORE_KEY = "fermiBestScore";
const DAILY_STATE_KEY = "fermiDailyState";

interface FermiResult {
  question: FermiQuestion;
  guess: number;
  logErr: number;
  score: number;
  verdict: FermiVerdict;
}

type Phase = "playing" | "revealed" | "summary";

interface StoredDailyState {
  dateKey: string;
  results: Array<{
    questionId: string;
    guess: number;
    logErr: number;
    score: number;
    verdict: FermiVerdict;
  }>;
  index: number;
  phase: Phase;
}

const toneClasses: Record<FermiVerdict["tone"], { text: string; bg: string; ring: string }> = {
  perfect: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  great: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  good: { text: "text-accent", bg: "bg-accent/15", ring: "ring-accent/30" },
  ok: { text: "text-warning", bg: "bg-warning/15", ring: "ring-warning/30" },
  poor: { text: "text-error", bg: "bg-error/15", ring: "ring-error/30" },
};

function hydrateResults(
  round: FermiQuestion[],
  stored: StoredDailyState["results"],
): FermiResult[] {
  const byId = new Map(round.map((q) => [q.id, q]));
  return stored
    .map((r) => {
      const question = byId.get(r.questionId);
      if (!question) return null;
      return { ...r, question };
    })
    .filter((r): r is FermiResult => r != null);
}

function loadDailyState(todayKey: string, round: FermiQuestion[]): {
  index: number;
  phase: Phase;
  results: FermiResult[];
} | null {
  try {
    const raw = window.localStorage.getItem(DAILY_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDailyState;
    if (parsed.dateKey !== todayKey) return null;
    return {
      index: parsed.index,
      phase: parsed.phase,
      results: hydrateResults(round, parsed.results),
    };
  } catch {
    return null;
  }
}

function saveDailyState(
  todayKey: string,
  index: number,
  phase: Phase,
  results: FermiResult[],
) {
  try {
    const payload: StoredDailyState = {
      dateKey: todayKey,
      index,
      phase,
      results: results.map((r) => ({
        questionId: r.question.id,
        guess: r.guess,
        logErr: r.logErr,
        score: r.score,
        verdict: r.verdict,
      })),
    };
    window.localStorage.setItem(DAILY_STATE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function FermiGame({ onExit }: { onExit: () => void }) {
  const todayKey = useMemo(() => utcDateKey(), []);
  const puzzleNumber = useMemo(() => getDailyPuzzleNumber(), []);
  const round = useMemo(() => getDailyFermiQuestions(), []);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FermiResult[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const current = round[index];
  const parsedPreview = useMemo(() => parseFermiInput(input), [input]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BEST_SCORE_KEY);
      if (stored != null) setBestScore(Number(stored));
    } catch {
      /* ignore */
    }

    const saved = loadDailyState(todayKey, round);
    if (saved) {
      setIndex(saved.index);
      setPhase(saved.phase);
      setResults(saved.results);
    }
    setHydrated(true);
  }, [todayKey, round]);

  useEffect(() => {
    if (!hydrated) return;
    saveDailyState(todayKey, index, phase, results);
  }, [hydrated, todayKey, index, phase, results]);

  useEffect(() => {
    if (phase === "playing") {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [phase, index]);

  const currentResult = phase === "revealed" ? results[results.length - 1] : null;
  const isLastQuestion = index + 1 >= round.length;

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || !current) return;
    const guess = parseFermiInput(input);
    if (guess == null) {
      setError("Couldn't read that number. Try 7 million, 8e7, or 7*10^10.");
      return;
    }
    const logErr = logError(guess, current.answer);
    const result: FermiResult = {
      question: current,
      guess,
      logErr,
      score: closenessScore(logErr),
      verdict: getVerdict(guess, current.answer),
    };
    setResults((prev) => [...prev, result]);
    setError(null);
    setPhase("revealed");
  }, [phase, current, input]);

  const handleNext = useCallback(() => {
    if (index + 1 >= round.length) {
      setPhase("summary");
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setError(null);
    setPhase("playing");
  }, [index, round.length]);

  const averageScore = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  }, [results]);

  useEffect(() => {
    if (phase !== "summary" || results.length === 0) return;
    if (bestScore == null || averageScore > bestScore) {
      setBestScore(averageScore);
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(averageScore));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const shareText = useMemo(() => {
    const lines = results.map((r) => `${r.score}/100 — ${r.verdict.label}`);
    return `Fermi Daily #${puzzleNumber} 🎯\n${lines.join("\n")}\nAverage: ${averageScore}/100\nThe ESAT Guide · Mental Maths`;
  }, [results, averageScore, puzzleNumber]);

  const handleCopyShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [shareText]);

  if (!hydrated) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center bg-background">
        <p className="text-sm font-medium text-text-muted">Loading today&apos;s puzzle…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-organic-lg bg-secondary/20 text-secondary">
            <Target className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-text">
              Fermi Daily #{puzzleNumber}
            </h1>
            <p className="text-xs font-medium text-text-muted">
              {FERMI_DAILY_ROUND_SIZE} questions · same for everyone today
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase !== "summary" && (
            <span className="text-sm font-semibold text-text-muted">
              {index + 1} / {round.length}
            </span>
          )}
          <button
            type="button"
            onClick={onExit}
            className="flex h-10 w-10 items-center justify-center rounded-organic-lg bg-surface text-text-muted outline-none transition-colors hover:bg-surface-mid hover:text-text"
            title="Exit game"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {/* Next question — above progress bar */}
      {phase === "revealed" && (
        <div className="flex shrink-0 justify-center px-4 pb-3 sm:px-6">
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 rounded-organic-lg bg-secondary px-6 py-2.5 text-sm font-bold text-white shadow-sm outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLastQuestion ? "See results" : "Next question"}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Progress bar */}
      {phase !== "summary" && (
        <div className="mx-4 mb-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface sm:mx-6">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-normal ease-signature"
            style={{
              width: `${((index + (phase === "revealed" ? 1 : 0)) / round.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 py-4 sm:px-6">
        <div className="w-full max-w-2xl">
          {phase === "playing" && current && (
            <PlayingView
              question={current}
              input={input}
              onInputChange={(v) => {
                setInput(v);
                if (error) setError(null);
              }}
              onSubmit={handleSubmit}
              parsedPreview={parsedPreview}
              error={error}
              inputRef={inputRef}
            />
          )}

          {phase === "revealed" && currentResult && (
            <RevealedView result={currentResult} />
          )}

          {phase === "summary" && (
            <SummaryView
              results={results}
              averageScore={averageScore}
              bestScore={bestScore}
              puzzleNumber={puzzleNumber}
              copied={copied}
              onCopyShare={handleCopyShare}
              onExit={onExit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Playing ------------------------------- */

function PlayingView({
  question,
  input,
  onInputChange,
  onSubmit,
  parsedPreview,
  error,
  inputRef,
}: {
  question: FermiQuestion;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  parsedPreview: number | null;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="animate-fade-in flex flex-col items-center gap-6 pt-4 sm:pt-10">
      <h2 className="text-balance text-center font-serif text-2xl leading-snug text-text sm:text-3xl">
        {question.question}
      </h2>

      <div className="flex w-full max-w-md flex-col gap-2">
        <div
          className={cn(
            "flex min-h-[2.5rem] items-center justify-center rounded-xl px-3 py-2 text-center transition-colors",
            input.trim()
              ? parsedPreview != null
                ? "bg-primary/10 text-primary"
                : "bg-error/10 text-error"
              : "bg-surface-elevated/50 text-text-disabled",
          )}
          aria-live="polite"
        >
          {input.trim() ? (
            parsedPreview != null ? (
              <span className="text-base font-semibold">
                = {formatFullNumber(parsedPreview)}
                <span className="ml-2 text-sm font-medium opacity-70">
                  ({formatFermiNumber(parsedPreview)})
                </span>
              </span>
            ) : (
              <span className="text-sm font-medium">Can&apos;t read that number yet…</span>
            )
          ) : (
            <span className="text-sm font-medium">Type an estimate below</span>
          )}
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="e.g. 7 million"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "h-16 w-full rounded-2xl border-0 pl-5 pr-16 text-2xl font-semibold outline-none transition-all duration-75",
              error
                ? "bg-error/20 text-error focus:ring-0"
                : "bg-surface-elevated text-text focus:ring-0",
              "placeholder:text-base placeholder:font-medium placeholder:text-text-disabled",
            )}
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!input.trim()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-3 outline-none transition-all",
              input.trim()
                ? "bg-secondary/20 text-secondary hover:scale-110 hover:bg-secondary/30"
                : "cursor-not-allowed bg-surface-elevated text-text-disabled",
            )}
            title="Submit estimate"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <p className="text-center text-xs font-medium text-text-muted">
          {error ?? "Accepts 7 million · 80000000 · 7*10^10 · 8e7"}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------- Revealed ------------------------------ */

function RevealedView({ result }: { result: FermiResult }) {
  const tone = toneClasses[result.verdict.tone];
  const { question, guess, score, verdict } = result;

  return (
    <div className="animate-slide-up flex flex-col items-center gap-5 pt-2 sm:pt-4">
      <h2 className="text-balance text-center font-serif text-xl leading-snug text-text sm:text-2xl">
        {question.question}
      </h2>

      <div className={cn("w-full max-w-md rounded-organic-xl p-4 text-center", tone.bg)}>
        <p className={cn("text-xl font-bold tracking-wide", tone.text)}>
          {verdict.label.toUpperCase()}
          <span className="mx-2 font-normal text-text-muted">·</span>
          <span>{score}/100</span>
        </p>
        <p className="mt-1.5 text-sm font-medium text-text-muted">{verdict.detail}</p>
      </div>

      <LogScaleBar guess={guess} answer={question.answer} tone={tone.text} />

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <div className="rounded-organic-lg bg-surface p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Your guess</p>
          <p className="mt-1 text-lg font-bold text-text">{formatFullNumber(guess)}</p>
          <p className="text-xs font-medium text-text-muted">{formatFermiNumber(guess)}</p>
        </div>
        <div className="rounded-organic-lg bg-surface p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Actual answer</p>
          <p className="mt-1 text-lg font-bold text-primary">
            {formatFullNumber(question.answer)}
          </p>
          <p className="text-xs font-medium text-text-muted">
            {formatFermiNumber(question.answer)}
            {question.unit ? ` ${question.unit}` : ""}
          </p>
        </div>
      </div>

      {question.note && (
        <p className="max-w-md text-balance text-center text-sm font-medium leading-relaxed text-text-muted">
          {question.note}
        </p>
      )}
    </div>
  );
}

function LogScaleBar({ guess, answer, tone }: { guess: number; answer: number; tone: string }) {
  const RANGE = 3;
  const delta = Math.log10(Math.max(guess, 1e-9)) - Math.log10(Math.max(answer, 1e-9));
  const clamped = Math.max(-RANGE, Math.min(RANGE, delta));
  const guessPct = 50 + (clamped / RANGE) * 50;

  return (
    <div className="w-full max-w-md">
      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-mid" />
        <div className="absolute left-1/2 top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        <div
          className={cn(
            "absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface-elevated shadow-sm ring-2",
            tone.replace("text-", "ring-"),
          )}
          style={{ left: `${guessPct}%` }}
        >
          <div className={cn("h-2.5 w-2.5 rounded-full", tone.replace("text-", "bg-"))} />
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-text-muted">
        <span>too low</span>
        <span className="text-primary">actual</span>
        <span>too high</span>
      </div>
    </div>
  );
}

/* ------------------------------- Summary ------------------------------- */

function SummaryView({
  results,
  averageScore,
  bestScore,
  puzzleNumber,
  copied,
  onCopyShare,
  onExit,
}: {
  results: FermiResult[];
  averageScore: number;
  bestScore: number | null;
  puzzleNumber: number;
  copied: boolean;
  onCopyShare: () => void;
  onExit: () => void;
}) {
  const isNewBest = bestScore != null && averageScore >= bestScore;

  return (
    <div className="animate-scale-in flex flex-col items-center gap-5 pt-4 sm:pt-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-organic-xl bg-secondary/20 text-secondary">
        <Sparkles className="h-7 w-7" strokeWidth={2} />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-text">Fermi Daily #{puzzleNumber}</h2>
        <p className="text-sm font-medium text-text-muted">Today&apos;s average closeness</p>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-6xl font-bold text-secondary">{averageScore}</span>
        <span className="mb-2 text-lg font-semibold text-text-muted">/ 100</span>
      </div>

      {bestScore != null && (
        <p className="text-sm font-semibold text-text-muted">
          {isNewBest ? "New personal best!" : `Personal best: ${bestScore}/100`}
        </p>
      )}

      <div className="flex w-full max-w-md flex-col gap-2">
        {results.map((r, i) => {
          const tone = toneClasses[r.verdict.tone];
          return (
            <div
              key={r.question.id}
              className="flex items-center gap-3 rounded-organic-lg bg-surface p-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-mid text-xs font-bold text-text-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {r.question.question}
              </span>
              <span className={cn("shrink-0 text-sm font-bold", tone.text)}>
                {r.verdict.label.toUpperCase()} · {r.score}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onCopyShare}
          className="flex w-full items-center justify-center gap-2 rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        <p className="text-center text-sm font-medium text-text-muted">
          Come back tomorrow for a new set of questions.
        </p>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="text-sm font-semibold text-text-muted outline-none transition-colors hover:text-text"
      >
        Back to Mental Maths
      </button>
    </div>
  );
}
