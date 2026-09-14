/**
 * FermiGuessr - daily mental-maths estimation minigame.
 *
 * Everyone gets the same five questions each UTC day. Questions cycle through
 * the bank without repeating until the pool is exhausted, then restart.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowRight, BarChart3, Eye, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { FermiQuestion, PlayableFermiQuestion } from "@/config/fermiQuestions";
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
import {
  formatDailyResetCountdown,
  msUntilNextUtcReset,
  utcDateKey,
} from "@/lib/fermi/dates";
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

type DailyRoundPayload =
  | {
      mode: "scheduled";
      puzzleNumber: number;
      playedDate: string;
      questions: PlayableFermiQuestion[];
    }
  | {
      mode: "bank";
      puzzleNumber: number;
      playedDate: string;
      questions: FermiQuestion[];
    };

function DailyResetSubtext() {
  const [label, setLabel] = useState(() => formatDailyResetCountdown(msUntilNextUtcReset()));

  useEffect(() => {
    const tick = () => setLabel(formatDailyResetCountdown(msUntilNextUtcReset()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return <p className="text-xs font-medium text-text-muted">{label}</p>;
}

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

  const [roundMode, setRoundMode] = useState<"scheduled" | "bank">("bank");
  const [round, setRound] = useState<PlayableFermiQuestion[]>([]);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [roundReady, setRoundReady] = useState(false);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<FermiPhase>("playing");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<FermiResult[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const current = round[index];
  const parsedPreview = useMemo(() => parseFermiInput(input), [input]);

  useEffect(() => {
    let cancelled = false;

    async function loadRound() {
      setRoundError(null);
      try {
        const res = await fetch("/api/fermi/daily");
        if (!res.ok) throw new Error("Failed to load daily puzzle");
        const data = (await res.json()) as DailyRoundPayload;
        if (cancelled) return;

        setRoundMode(data.mode);
        setPuzzleNumber(data.puzzleNumber);
        setRound(data.questions);

        setBestScore(readFermiBestScore());

        const saved = loadFermiDailyState(todayKey, data.questions as FermiQuestion[]);
        if (saved) {
          setIndex(saved.index);
          setPhase(saved.phase);
          setResults(saved.results);
          if (isFermiDailyComplete(saved, data.questions.length)) {
            setCompletedToday(true);
            setPhase("summary");
            setIndex(data.questions.length - 1);
          }
        }
        setHydrated(true);
      } catch {
        if (!cancelled) {
          setRoundError("Could not load today's puzzle. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) setRoundReady(true);
      }
    }

    void loadRound();

    try {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i += 1) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith("app-chunk-reload")) keysToRemove.push(key);
        }
        keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }

    return () => {
      cancelled = true;
    };
  }, [todayKey]);

  useEffect(() => {
    if (!hydrated || !roundReady) return;
    saveFermiDailyState(todayKey, index, phase, results, roundMode);
  }, [hydrated, roundReady, todayKey, index, phase, results, roundMode]);

  useEffect(() => {
    if (phase === "playing") {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [phase, index]);

  const currentResult = phase === "revealed" ? results[results.length - 1] : null;
  const isLastQuestion = index + 1 >= round.length;
  const displayPhase: FermiPhase = completedToday ? "summary" : phase;

  const handleSubmit = useCallback(async () => {
    if (phase !== "playing" || !current || completedToday || submitting) return;
    const guess = parseFermiInput(input);
    if (guess == null) {
      setError("Couldn't read that number. Try 7 million, 8e7, or 7*10^10.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let result: FermiResult;

      if (roundMode === "scheduled") {
        const res = await fetch("/api/fermi/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: current.id, guess }),
        });
        if (!res.ok) {
          setError("Could not score that guess. Try again.");
          return;
        }
        const data = (await res.json()) as {
          question: FermiQuestion;
          logErr: number;
          score: number;
          verdict: FermiVerdict;
          guess: number;
        };
        result = {
          question: data.question,
          guess: data.guess,
          logErr: data.logErr,
          score: data.score,
          verdict: data.verdict,
        };
      } else {
        if (current.answer == null) {
          setError("Something went wrong loading this question.");
          return;
        }
        const logErr = logError(guess, current.answer);
        result = {
          question: current as FermiQuestion,
          guess,
          logErr,
          score: closenessScore(logErr),
          verdict: getVerdict(guess, current.answer),
        };
      }

      setResults((prev) => [...prev, result]);
      setPhase("revealed");
    } finally {
      setSubmitting(false);
    }
  }, [phase, current, input, completedToday, submitting, roundMode]);

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
    const lines = results.map((r) => `${r.score}/100 · ${r.verdict.label}`);
    return `${FERMI_GUESSR_NAME} #${puzzleNumber} 🎯\n${lines.join("\n")}\nAverage: ${averageScore}/100\nESAT CAMP · Mental Maths`;
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

  if (!hydrated || !roundReady) {
    return (
      <div className="flex h-[calc(100vh-58px)] items-center justify-center bg-background">
        <p className="text-sm font-medium text-text-muted">Loading today&apos;s puzzle…</p>
      </div>
    );
  }

  if (roundError || round.length === 0) {
    return (
      <div className="flex h-[calc(100vh-58px)] flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm font-medium text-text-muted">
          {roundError ?? "Today's puzzle is unavailable."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-sm bg-secondary px-5 py-2.5 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-58px)] max-h-[calc(100vh-58px)] flex-col overflow-hidden bg-background">
      {/* Compact header: title · progress · count · close */}
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 shrink-0">
          <h1 className="truncate text-sm font-bold leading-none text-text sm:text-base">
            {FERMI_GUESSR_NAME} #{puzzleNumber}
          </h1>
          {displayPhase === "summary" && (
            <div className="mt-1">
              <DailyResetSubtext />
            </div>
          )}
        </div>

        {displayPhase !== "summary" && (
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-surface">
            <div
              className="h-full rounded-sm bg-secondary transition-all duration-normal ease-signature"
              style={{
                width: `${((index + (displayPhase === "revealed" ? 1 : 0)) / round.length) * 100}%`,
              }}
            />
          </div>
        )}

        {displayPhase === "summary" && <div className="min-w-0 flex-1" />}

        <div className="flex shrink-0 items-center gap-2">
          {displayPhase !== "summary" && (
            <span className="text-xs font-semibold tabular-nums text-text-muted sm:text-sm">
              {index + 1}/{round.length}
            </span>
          )}
          <button
            type="button"
            onClick={onExit}
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-surface text-text-muted outline-none transition-colors hover:bg-surface-mid hover:text-text"
            title="Exit game"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div
        className={cn(
          "flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-4 sm:px-6",
          displayPhase === "summary" ? "items-start" : "items-start pt-6 sm:pt-10",
        )}
      >
        <div className="w-full max-w-3xl">
          <LayoutGroup id="fermi-stage">
          {displayPhase === "playing" && current && !completedToday && (
            <PlayingView
              question={current}
              input={input}
              onInputChange={(v) => {
                setInput(v);
                if (error) setError(null);
              }}
              onSubmit={() => void handleSubmit()}
              parsedPreview={parsedPreview}
              error={error}
              submitting={submitting}
              inputRef={inputRef}
            />
          )}

          {displayPhase === "revealed" && currentResult && (
            <RevealedView
              result={currentResult}
              input={input}
              onNext={handleNext}
              isLastQuestion={isLastQuestion}
            />
          )}
          </LayoutGroup>

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

const PREVIEW_SLOT =
  "flex min-h-[2.5rem] items-center justify-center rounded-sm px-3 py-2 text-center";

/** Fixed hero height so reveal score panel never shifts slider/input. */
const QUESTION_ZONE =
  "flex w-full max-w-3xl flex-col items-stretch justify-center min-h-[9.5rem] sm:min-h-[10.5rem]";

function FermiStageShell({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-col items-center gap-6">{children}</div>;
}

function FermiControlsColumn({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full max-w-xl flex-col gap-2">{children}</div>;
}

function PlayingView({
  question,
  input,
  onInputChange,
  onSubmit,
  parsedPreview,
  error,
  submitting,
  inputRef,
}: {
  question: PlayableFermiQuestion;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  parsedPreview: number | null;
  error: string | null;
  submitting: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const hasInput = Boolean(input.trim());

  return (
    <FermiStageShell>
      <div className={QUESTION_ZONE}>
        <motion.h2
          layoutId="fermi-question"
          className="text-balance text-center font-serif text-2xl leading-snug text-text sm:text-3xl"
        >
          {question.question}
        </motion.h2>
      </div>

      <FermiControlsColumn>
        <div
          className={cn(
            PREVIEW_SLOT,
            "transition-colors",
            hasInput
              ? parsedPreview != null
                ? "bg-primary/10 text-primary"
                : "bg-error/10 text-error"
              : "bg-transparent",
          )}
          aria-live="polite"
        >
          {hasInput ? (
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
          ) : null}
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
              "h-16 w-full rounded-sm border-0 pl-5 pr-16 text-2xl font-semibold outline-none transition-all duration-75",
              error
                ? "bg-error/20 text-error focus:ring-0"
                : "bg-surface-elevated text-text focus:ring-0",
              "placeholder:text-base placeholder:font-medium placeholder:text-text-disabled",
            )}
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!input.trim() || submitting}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-3 outline-none transition-all",
              input.trim()
                ? "bg-secondary/20 text-secondary hover:bg-secondary/30"
                : "cursor-not-allowed bg-surface-elevated text-text-disabled",
            )}
            title="Submit estimate"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {error ? (
          <p className="min-h-[1rem] text-center text-xs font-medium text-error">{error}</p>
        ) : (
          <div className="min-h-[1rem]" aria-hidden />
        )}
      </FermiControlsColumn>
    </FermiStageShell>
  );
}

/* ------------------------------- Revealed ------------------------------ */

function LogScaleBar({ guess, answer, tone }: { guess: number; answer: number; tone: string }) {
  /** Track is linear in log10-space: left = answer/10^RANGE, right = answer*10^RANGE. */
  const RANGE = 3;
  const SNAP_ORDERS = 0.12;
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubOrders, setScrubOrders] = useState<number | null>(null);

  const answerLog = Math.log10(Math.max(answer, 1e-9));
  const guessOrders = Math.log10(Math.max(guess, 1e-9)) - answerLog;
  const guessClamped = Math.max(-RANGE, Math.min(RANGE, guessOrders));
  const guessPct = ((guessClamped + RANGE) / (2 * RANGE)) * 100;

  const snapped =
    scrubOrders != null && Math.abs(scrubOrders - guessClamped) <= SNAP_ORDERS;
  const activeOrders = scrubOrders == null ? guessClamped : snapped ? guessClamped : scrubOrders;
  const activePct = ((activeOrders + RANGE) / (2 * RANGE)) * 100;
  const scrubValue = snapped ? guess : 10 ** (answerLog + activeOrders);
  const scrubScore = snapped
    ? closenessScore(Math.abs(guessOrders))
    : closenessScore(Math.abs(activeOrders));
  const scrubLabel = `${formatFermiNumber(scrubValue)} · ${scrubScore}/100`;

  const decadeTicks = useMemo(() => {
    const ticks: { orders: number; label: string }[] = [];
    for (let o = -RANGE; o <= RANGE; o += 1) {
      if (o === 0) continue;
      ticks.push({
        orders: o,
        label: o > 0 ? `×10^${o}` : `×10^${o}`,
      });
    }
    return ticks;
  }, [RANGE]);

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const orders = (pct / 100) * (2 * RANGE) - RANGE;
    setScrubOrders(Math.abs(orders - guessClamped) <= SNAP_ORDERS ? guessClamped : orders);
  };

  return (
    <div
      className="w-full max-w-xl select-none py-1"
      onPointerLeave={() => setScrubOrders(null)}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label="Log-scale closeness explorer"
        aria-valuemin={-RANGE}
        aria-valuemax={RANGE}
        aria-valuenow={Number(activeOrders.toFixed(2))}
        aria-valuetext={scrubLabel}
        tabIndex={0}
        className="relative h-10 cursor-ew-resize touch-none outline-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          updateFromClientX(e.clientX);
        }}
        onKeyDown={(e) => {
          const step = 0.25;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setScrubOrders((o) => {
              const next = Math.max(-RANGE, (o ?? guessClamped) - step);
              return Math.abs(next - guessClamped) <= SNAP_ORDERS ? guessClamped : next;
            });
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setScrubOrders((o) => {
              const next = Math.min(RANGE, (o ?? guessClamped) + step);
              return Math.abs(next - guessClamped) <= SNAP_ORDERS ? guessClamped : next;
            });
          } else if (e.key === "Home") {
            e.preventDefault();
            setScrubOrders(-RANGE);
          } else if (e.key === "End") {
            e.preventDefault();
            setScrubOrders(RANGE);
          } else if (e.key === "Escape") {
            setScrubOrders(null);
          }
        }}
      >
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-sm bg-surface-mid" />

        {/* Log decade ticks */}
        {decadeTicks.map((tick) => {
          const pct = ((tick.orders + RANGE) / (2 * RANGE)) * 100;
          return (
            <div
              key={tick.orders}
              className="pointer-events-none absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-text-disabled"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        <div className="absolute left-1/2 top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-primary" />

        {/* Your actual guess marker (fixed) */}
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm bg-surface-elevated shadow-sm ring-2",
            tone.replace("text-", "ring-"),
            scrubOrders != null && !snapped && "opacity-40",
          )}
          style={{ left: `${guessPct}%` }}
          title="Your guess"
        >
          <div className={cn("h-2.5 w-2.5 rounded-sm", tone.replace("text-", "bg-"))} />
        </div>

        {scrubOrders != null && !snapped && (
          <div
            className="pointer-events-none absolute top-1/2 h-7 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-text"
            style={{ left: `${activePct}%` }}
          />
        )}

        <div
          className={cn(
            "pointer-events-none absolute -top-8 z-10 -translate-x-1/2 whitespace-nowrap rounded-sm bg-surface-elevated px-2 py-1 text-[11px] font-medium tabular-nums text-text shadow-sm",
            scrubOrders == null && "opacity-0",
          )}
          style={{ left: `${activePct}%` }}
        >
          {scrubLabel}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wide text-text-muted">
        <span>×10^-3</span>
        <span className="text-primary">actual</span>
        <span>×10^3</span>
      </div>
    </div>
  );
}

function IconActionButton({
  onClick,
  label,
  tone = "muted",
  children,
}: {
  onClick: () => void;
  label: string;
  tone?: "muted" | "primary";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "group/btn inline-flex h-11 items-center justify-center gap-0 overflow-hidden rounded-sm px-3 outline-none transition-all duration-150",
        tone === "primary"
          ? "bg-secondary text-white hover:brightness-110"
          : "bg-surface text-text-muted hover:bg-surface-mid hover:text-text",
      )}
    >
      <span className="shrink-0">{children}</span>
      <span
        className={cn(
          "max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-150",
          "group-hover/btn:ml-2 group-hover/btn:max-w-[11rem] group-hover/btn:opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function RevealedView({
  result,
  input,
  onNext,
  isLastQuestion,
}: {
  result: FermiResult;
  input: string;
  onNext: () => void;
  isLastQuestion: boolean;
}) {
  const tone = toneClasses[result.verdict.tone];
  const { question, guess, score, verdict } = result;
  const solution =
    question.note?.trim() ||
    `Answer ≈ ${formatFermiNumber(question.answer)}${question.unit ? ` ${question.unit}` : ""}`;
  const [showSolution, setShowSolution] = useState(false);
  const guessLabel = input.trim() || formatFullNumber(guess);

  return (
    <FermiStageShell>
      <div className={QUESTION_ZONE}>
        <motion.h2
          layoutId="fermi-question"
          className="truncate text-center text-sm font-medium leading-tight text-text-muted sm:text-base"
          title={question.question}
        >
          {question.question}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="mt-2 flex min-h-0 flex-1 flex-col items-center justify-center text-center"
        >
          <p
            className={cn("text-5xl font-bold tabular-nums leading-none sm:text-6xl", tone.text)}
            aria-label={`Score ${score} out of 100`}
          >
            {score}
            <span className="text-2xl font-semibold text-text-muted sm:text-3xl">/100</span>
          </p>
          <h3
            className={cn(
              "mt-2 text-lg font-bold uppercase tracking-wide sm:text-xl",
              tone.text,
            )}
          >
            {verdict.label}
          </h3>
        </motion.div>
      </div>

      <FermiControlsColumn>
        <LogScaleBar guess={guess} answer={question.answer} tone={tone.text} />

        <div className="flex h-16 w-full items-center gap-2 rounded-sm bg-surface-elevated pl-5 pr-2">
          <span
            className="min-w-0 flex-1 truncate text-2xl font-semibold text-text"
            aria-label={`Your guess: ${guessLabel}`}
          >
            {guessLabel}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <IconActionButton
              onClick={() => setShowSolution((v) => !v)}
              label={showSolution ? "Hide solution" : "View our solution"}
              tone="muted"
            >
              <Eye className="h-5 w-5" strokeWidth={2} />
            </IconActionButton>
            <IconActionButton
              onClick={onNext}
              label={isLastQuestion ? "See results" : "Next question"}
              tone="primary"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </IconActionButton>
          </div>
        </div>

        <p className="min-h-[1rem] text-center text-sm font-medium text-text">
          <span className="text-text-muted">Answer </span>
          <span className="font-semibold text-primary">
            {formatFermiNumber(question.answer)}
            {question.unit ? ` ${question.unit}` : ""}
          </span>
        </p>
      </FermiControlsColumn>

      {showSolution && (
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
      )}

      {question.didYouKnow ? (
        <div className="w-full max-w-xl rounded-sm bg-surface-elevated px-4 py-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">
            Did you know?
          </p>
          <p className="mt-1 text-sm leading-snug text-text">{question.didYouKnow}</p>
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
    </FermiStageShell>
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
                "flex flex-col items-center gap-1 rounded-sm py-3 outline-none transition-colors duration-150",
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
    <div className={cn("rounded-sm p-4", tone.bg)}>
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
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-secondary px-4 py-3 text-sm font-bold text-white outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2.25} />
          View stats
        </button>
        <button
          type="button"
          onClick={onCopyShare}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-surface px-4 py-3 text-sm font-bold text-text outline-none transition-colors hover:bg-surface-mid"
        >
          {copied ? "Copied!" : "Share result"}
        </button>
        {!isLoggedIn && (
          <p className="text-center text-xs font-medium text-text-muted">
            Progress saved on this device. Log in to sync stats and see rankings.
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
