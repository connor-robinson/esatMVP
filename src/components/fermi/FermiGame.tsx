/**
 * Fermi Estimation — a self-contained mental-maths minigame.
 *
 * Flow: a short round of Fermi questions. The player types an estimate in any
 * common format ("7 million", "8e7", "7*10^10"), submits, and gets scored on
 * log-scale closeness to the true value. Ends with a shareable summary.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles, Star, Target, X } from "lucide-react";
import { cn, shuffle } from "@/lib/utils";
import {
  FERMI_QUESTIONS,
  type FermiQuestion,
} from "@/config/fermiQuestions";
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

const ROUND_SIZE = 5;
const BEST_SCORE_KEY = "fermiBestScore";

interface FermiResult {
  question: FermiQuestion;
  guess: number;
  logErr: number;
  score: number;
  verdict: FermiVerdict;
}

type Phase = "playing" | "revealed" | "summary";

const toneClasses: Record<FermiVerdict["tone"], { text: string; bg: string; ring: string }> = {
  perfect: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  great: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  good: { text: "text-accent", bg: "bg-accent/15", ring: "ring-accent/30" },
  ok: { text: "text-warning", bg: "bg-warning/15", ring: "ring-warning/30" },
  poor: { text: "text-error", bg: "bg-error/15", ring: "ring-error/30" },
};

export function FermiGame({ onExit }: { onExit: () => void }) {
  const [round, setRound] = useState<FermiQuestion[]>(() =>
    shuffle(FERMI_QUESTIONS).slice(0, ROUND_SIZE),
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FermiResult[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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
  }, []);

  useEffect(() => {
    if (phase === "playing") {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [phase, index]);

  const currentResult = phase === "revealed" ? results[results.length - 1] : null;

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

  const handlePlayAgain = useCallback(() => {
    setRound(shuffle(FERMI_QUESTIONS).slice(0, ROUND_SIZE));
    setIndex(0);
    setResults([]);
    setInput("");
    setError(null);
    setCopied(false);
    setPhase("playing");
  }, []);

  const shareText = useMemo(() => {
    const stars = results
      .map((r) => "★".repeat(r.verdict.stars) + "☆".repeat(5 - r.verdict.stars))
      .join("\n");
    return `Fermi Estimation 🎯\nAverage closeness: ${averageScore}/100\n${stars}\nThe ESAT Guide · Mental Maths`;
  }, [results, averageScore]);

  const handleCopyShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [shareText]);

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
              Fermi Estimation
            </h1>
            <p className="text-xs font-medium text-text-muted">
              Order-of-magnitude minigame
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
            <RevealedView
              result={currentResult}
              isLast={index + 1 >= round.length}
              onNext={handleNext}
            />
          )}

          {phase === "summary" && (
            <SummaryView
              results={results}
              averageScore={averageScore}
              bestScore={bestScore}
              copied={copied}
              onCopyShare={handleCopyShare}
              onPlayAgain={handlePlayAgain}
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
      <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
        {question.category}
      </span>

      <h2 className="text-balance text-center font-serif text-2xl leading-snug text-text sm:text-3xl">
        {question.question}
      </h2>

      <div className="flex w-full max-w-md flex-col gap-2">
        {/* Live parse preview */}
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

        {/* Input row */}
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

function RevealedView({
  result,
  isLast,
  onNext,
}: {
  result: FermiResult;
  isLast: boolean;
  onNext: () => void;
}) {
  const tone = toneClasses[result.verdict.tone];
  const { question, guess, score, verdict } = result;

  return (
    <div className="animate-slide-up flex flex-col items-center gap-5 pt-2 sm:pt-6">
      <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
        {question.category}
      </span>

      <h2 className="text-balance text-center font-serif text-xl leading-snug text-text sm:text-2xl">
        {question.question}
      </h2>

      {/* Verdict */}
      <div className={cn("flex w-full max-w-md flex-col items-center gap-2 rounded-organic-xl p-5 text-center", tone.bg)}>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-5 w-5", i < verdict.stars ? tone.text : "text-text-disabled")}
              strokeWidth={2}
              fill={i < verdict.stars ? "currentColor" : "none"}
            />
          ))}
        </div>
        <p className={cn("text-2xl font-bold", tone.text)}>{verdict.label}</p>
        <p className="text-sm font-medium text-text-muted">{verdict.detail}</p>
        <p className={cn("mt-1 text-sm font-semibold", tone.text)}>
          Closeness {score}/100
        </p>
      </div>

      {/* Log-scale comparison */}
      <LogScaleBar guess={guess} answer={question.answer} tone={tone.text} />

      {/* Numbers */}
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

      <button
        type="button"
        onClick={onNext}
        className="mt-1 flex items-center gap-2 rounded-organic-lg bg-secondary px-6 py-3 text-sm font-bold text-white shadow-sm outline-none transition-all hover:scale-[1.03] active:scale-[0.98]"
      >
        {isLast ? "See results" : "Next question"}
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** Number line in log10 space: answer pinned at centre, guess offset by its error. */
function LogScaleBar({ guess, answer, tone }: { guess: number; answer: number; tone: string }) {
  const RANGE = 3; // ± orders of magnitude shown
  const delta = Math.log10(Math.max(guess, 1e-9)) - Math.log10(Math.max(answer, 1e-9));
  const clamped = Math.max(-RANGE, Math.min(RANGE, delta));
  const guessPct = 50 + (clamped / RANGE) * 50;

  return (
    <div className="w-full max-w-md">
      <div className="relative h-10">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-mid" />
        {/* answer marker (centre) */}
        <div className="absolute left-1/2 top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
        {/* guess marker */}
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
  copied,
  onCopyShare,
  onPlayAgain,
  onExit,
}: {
  results: FermiResult[];
  averageScore: number;
  bestScore: number | null;
  copied: boolean;
  onCopyShare: () => void;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const isNewBest = bestScore != null && averageScore >= bestScore;

  return (
    <div className="animate-scale-in flex flex-col items-center gap-5 pt-4 sm:pt-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-organic-xl bg-secondary/20 text-secondary">
        <Sparkles className="h-7 w-7" strokeWidth={2} />
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-text">Round complete</h2>
        <p className="text-sm font-medium text-text-muted">
          Average closeness across {results.length} questions
        </p>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-6xl font-bold text-secondary">{averageScore}</span>
        <span className="mb-2 text-lg font-semibold text-text-muted">/ 100</span>
      </div>

      {bestScore != null && (
        <p className="text-sm font-semibold text-text-muted">
          {isNewBest ? "🎉 New personal best!" : `Personal best: ${bestScore}/100`}
        </p>
      )}

      {/* Per-question breakdown */}
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
              <span className={cn("shrink-0 text-sm font-bold", tone.text)}>{r.score}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-md flex-col gap-2 pt-1 sm:flex-row">
        <button
          type="button"
          onClick={onCopyShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-organic-lg bg-surface px-4 py-3 text-sm font-bold text-text outline-none transition-colors hover:bg-surface-mid"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex flex-1 items-center justify-center gap-2 rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Play again
        </button>
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
