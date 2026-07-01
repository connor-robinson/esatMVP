/**
 * FermiGuessr — daily mental-maths estimation minigame.
 *
 * Everyone gets the same five questions each UTC day. Questions cycle through
 * the bank without repeating until the pool is exhausted, then restart.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BarChart3, X } from "lucide-react";
import { FermiGuessrIcon } from "@/components/icons/FermiGuessrIcon";
import { cn } from "@/lib/utils";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
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
  getDailyFermiQuestions,
  getDailyPuzzleNumber,
} from "@/lib/fermi/dailyQuestions";
import {
  FERMI_GUESSR_NAME,
  FERMI_GUESSR_STATS_PATH,
} from "@/config/fermiGuessr";
import {
  isFermiDailyComplete,
  loadFermiDailyState,
  readFermiBestScore,
  saveFermiDailyState,
  writeFermiBestScore,
  type FermiPhase,
  type HydratedFermiResult,
} from "@/lib/fermi/dailyState";

interface FermiResult extends HydratedFermiResult {}

const toneClasses: Record<FermiVerdict["tone"], { text: string; bg: string; ring: string }> = {
  perfect: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  great: { text: "text-primary", bg: "bg-primary/15", ring: "ring-primary/30" },
  good: { text: "text-accent", bg: "bg-accent/15", ring: "ring-accent/30" },
  ok: { text: "text-warning", bg: "bg-warning/15", ring: "ring-warning/30" },
  poor: { text: "text-error", bg: "bg-error/15", ring: "ring-error/30" },
};

export function FermiGame({ onExit }: { onExit: () => void }) {
  const router = useRouter();
  const authSession = useSupabaseSession();
  const sessionSavedRef = useRef(false);
  const todayKey = useMemo(() => utcDateKey(), []);
  const puzzleNumber = useMemo(() => getDailyPuzzleNumber(), []);
  const round = useMemo(() => getDailyFermiQuestions(), []);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<FermiPhase>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FermiResult[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const current = round[index];
  const parsedPreview = useMemo(() => parseFermiInput(input), [input]);

  useEffect(() => {
    setBestScore(readFermiBestScore());

    const saved = loadFermiDailyState(todayKey, round);
    if (saved) {
      setIndex(saved.index);
      setPhase(saved.phase);
      setResults(saved.results);
      if (isFermiDailyComplete(saved, round.length)) {
        setCompletedToday(true);
        setPhase("summary");
        setIndex(round.length - 1);
      }
    }
    setHydrated(true);

    try {
      window.sessionStorage.removeItem("app-chunk-reload");
    } catch {
      /* ignore */
    }
  }, [todayKey, round]);

  useEffect(() => {
    if (!hydrated) return;
    saveFermiDailyState(todayKey, index, phase, results);
  }, [hydrated, todayKey, index, phase, results]);

  useEffect(() => {
    if (phase === "playing") {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [phase, index]);

  const currentResult = phase === "revealed" ? results[results.length - 1] : null;
  const isLastQuestion = index + 1 >= round.length;
  const displayPhase: FermiPhase = completedToday ? "summary" : phase;

  const handleSubmit = useCallback(() => {
    if (phase !== "playing" || !current || completedToday) return;
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
  }, [phase, current, input, completedToday]);

  const handleNext = useCallback(() => {
    if (index + 1 >= round.length) {
      setCompletedToday(true);
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
      writeFermiBestScore(averageScore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (
      phase !== "summary" ||
      results.length === 0 ||
      !authSession?.user ||
      sessionSavedRef.current
    ) {
      return;
    }
    sessionSavedRef.current = true;
    void fetch("/api/fermi/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleNumber,
        playedDate: todayKey,
        averageScore,
        results: results.map((r) => ({
          questionId: r.question.id,
          guess: r.guess,
          logError: r.logErr,
          closenessScore: r.score,
        })),
      }),
    });
  }, [phase, results, authSession?.user, puzzleNumber, todayKey, averageScore]);

  const statsHref = FERMI_GUESSR_STATS_PATH;
  const loginStatsHref = `/login?redirectTo=${encodeURIComponent(statsHref)}`;

  const handleViewStats = useCallback(() => {
    if (!authSession?.user) {
      router.push(loginStatsHref);
      return;
    }
    router.push(statsHref);
  }, [authSession?.user, router, loginStatsHref]);

  const shareText = useMemo(() => {
    const lines = results.map((r) => `${r.score}/100 — ${r.verdict.label}`);
    return `${FERMI_GUESSR_NAME} #${puzzleNumber} 🎯\n${lines.join("\n")}\nAverage: ${averageScore}/100\nThe ESAT Guide · Mental Maths`;
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
            <FermiGuessrIcon className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-text">
              {FERMI_GUESSR_NAME} #{puzzleNumber}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {displayPhase !== "summary" && (
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
      {displayPhase === "revealed" && (
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
      {displayPhase !== "summary" && (
        <div className="mx-4 mb-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface sm:mx-6">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-normal ease-signature"
            style={{
              width: `${((index + (displayPhase === "revealed" ? 1 : 0)) / round.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Body */}
      <div
        className={cn(
          "flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-4 sm:px-6",
          displayPhase === "playing" ? "items-center" : "items-start",
        )}
      >
        <div className="w-full max-w-2xl">
          {displayPhase === "playing" && current && !completedToday && (
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

          {displayPhase === "revealed" && currentResult && (
            <RevealedView result={currentResult} />
          )}

          {displayPhase === "summary" && (
            <SummaryView
              results={results}
              averageScore={averageScore}
              bestScore={bestScore}
              puzzleNumber={puzzleNumber}
              copied={copied}
              onCopyShare={handleCopyShare}
              onViewStats={handleViewStats}
              isLoggedIn={!!authSession?.user}
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
    <div className="animate-fade-in flex w-full flex-col items-center gap-6">
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

        {error && (
          <p className="text-center text-xs font-medium text-error">{error}</p>
        )}
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

/* --------------------------- Results score grid -------------------------- */

function FermiResultsScoreGrid({
  results,
  activeIndex,
  onActiveChange,
}: {
  results: FermiResult[];
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
}) {
  return (
    <div
      className="w-full max-w-lg"
      onMouseLeave={() => onActiveChange(null)}
    >
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${results.length}, minmax(0, 1fr))` }}
      >
        {results.map((r, i) => {
          const tone = toneClasses[r.verdict.tone];
          const isActive = activeIndex === i;

          return (
            <button
              key={r.question.id}
              type="button"
              className={cn(
                "flex flex-col items-center gap-1 rounded-organic-lg py-3 outline-none transition-colors duration-150",
                isActive ? "bg-surface" : "bg-transparent hover:bg-surface/70",
              )}
              onMouseEnter={() => onActiveChange(i)}
              onFocus={() => onActiveChange(i)}
              onClick={() => onActiveChange(i)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  onActiveChange(null);
                }
              }}
              aria-label={`Q${i + 1}, score ${r.score} out of 100`}
              aria-expanded={isActive}
            >
              <span className="text-[10px] font-semibold tracking-wide text-text-muted sm:text-xs">
                Q{i + 1}
              </span>
              <span className={cn("text-xl font-bold tabular-nums sm:text-2xl", tone.text)}>
                {r.score}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FermiResultDetailPanel({ result }: { result: FermiResult }) {
  const tone = toneClasses[result.verdict.tone];

  return (
    <div className={cn("rounded-organic-lg p-4", tone.bg)}>
      <div className="flex flex-col gap-3">
        <p className="text-balance text-sm font-medium leading-snug text-text sm:text-base">
          {result.question.question}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Your guess
            </p>
            <p className="mt-0.5 text-sm font-bold text-text">
              {formatFullNumber(result.guess)}
            </p>
            <p className="text-xs font-medium text-text-muted">
              {formatFermiNumber(result.guess)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Answer
            </p>
            <p className="mt-0.5 text-sm font-bold text-primary">
              {formatFullNumber(result.question.answer)}
            </p>
            <p className="text-xs font-medium text-text-muted">
              {formatFermiNumber(result.question.answer)}
              {result.question.unit ? ` ${result.question.unit}` : ""}
            </p>
          </div>
        </div>
        <p className={cn("text-xs font-bold uppercase tracking-wide", tone.text)}>
          {result.verdict.label} · {result.score}/100
        </p>
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
  onViewStats,
  isLoggedIn,
  onExit,
}: {
  results: FermiResult[];
  averageScore: number;
  bestScore: number | null;
  puzzleNumber: number;
  copied: boolean;
  onCopyShare: () => void;
  onViewStats: () => void;
  isLoggedIn: boolean;
  onExit: () => void;
}) {
  const isNewBest = bestScore != null && averageScore >= bestScore;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeResult = activeIndex != null ? results[activeIndex] : null;

  return (
    <div className="animate-scale-in flex flex-col items-center gap-5 pt-2 sm:pt-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text">{FERMI_GUESSR_NAME} #{puzzleNumber}</h2>
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

      <div className="flex w-full max-w-lg flex-col">
        <FermiResultsScoreGrid
          results={results}
          activeIndex={activeIndex}
          onActiveChange={setActiveIndex}
        />

        <AnimatePresence initial={false}>
          {activeResult && (
            <motion.div
              key="fermi-detail-panel"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
              aria-live="polite"
            >
              <FermiResultDetailPanel result={activeResult} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onViewStats}
          className="flex w-full items-center justify-center gap-2 rounded-organic-lg bg-secondary px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2.25} />
          View stats
        </button>
        <button
          type="button"
          onClick={onCopyShare}
          className="flex w-full items-center justify-center gap-2 rounded-organic-lg bg-surface px-4 py-3 text-sm font-bold text-text outline-none transition-colors hover:bg-surface-mid"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        <p className="text-center text-sm font-medium text-text-muted">
          {isLoggedIn
            ? "Come back tomorrow for a new set of questions."
            : "Progress saved on this device. Log in to sync stats and see rankings."}
        </p>
        {!isLoggedIn && (
          <p className="text-center text-xs font-medium text-text-muted">
            One puzzle per day — come back tomorrow for the next one.
          </p>
        )}
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
