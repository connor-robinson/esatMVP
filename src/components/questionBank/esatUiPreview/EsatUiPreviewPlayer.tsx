"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Grid3X3,
  Hash,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { StemContent } from "@/components/shared/StemContent";
import {
  CALIBRATION_QUESTIONS,
  type CalibrationDifficulty,
  type CalibrationQuestion,
} from "@/lib/calibration/config";
import { cn } from "@/lib/utils";
import "./esatUiPreview.css";

const PREVIEW_COUNT = 10;
const TIME_LIMIT_SECONDS = Math.round((23 / 15) * PREVIEW_COUNT * 60);

const PREVIEW_QUESTIONS: CalibrationQuestion[] = CALIBRATION_QUESTIONS.slice(
  0,
  PREVIEW_COUNT,
);

const DIFFICULTY_LABEL: Record<
  CalibrationDifficulty,
  { label: string; className: string }
> = {
  accessible: { label: "Easy", className: "eup-pill--easy" },
  medium: { label: "Medium", className: "eup-pill--medium" },
  difficult: { label: "Hard", className: "eup-pill--hard" },
};

type QuestionState = {
  selected: string | null;
  incorrect: string[];
  solved: boolean;
  revealed: boolean;
  flagged: boolean;
  visited: boolean;
};

type NavStatus = "unseen" | "incomplete" | "correct" | "incorrect";

function emptyState(): QuestionState {
  return {
    selected: null,
    incorrect: [],
    solved: false,
    revealed: false,
    flagged: false,
    visited: false,
  };
}

function navStatus(s: QuestionState | undefined): NavStatus {
  if (!s) return "unseen";
  if (s.solved) return "correct";
  if (s.revealed) return "incorrect";
  if (s.visited || s.selected || s.incorrect.length > 0) return "incomplete";
  return "unseen";
}

function navStatusLabel(status: NavStatus): string {
  if (status === "correct") return "Correct";
  if (status === "incorrect") return "Incorrect";
  if (status === "incomplete") return "Incomplete";
  return "Unseen";
}

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function solutionMarkdown(q: CalibrationQuestion): string {
  const steps = q.solution.steps_markdown.join("\n\n");
  return `**${q.solution.title}**\n\n${steps}\n\n${q.solution.final_answer_markdown}`;
}

export function EsatUiPreviewPlayer() {
  const [shellTheme, setShellTheme] = useState<"light" | "dark">("light");
  const isDark = shellTheme === "dark";
  const toggleShellTheme = () => {
    setShellTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Record<string, QuestionState>>(() =>
    Object.fromEntries(PREVIEW_QUESTIONS.map((q) => [q.id, emptyState()])),
  );
  const [remaining, setRemaining] = useState(TIME_LIMIT_SECONDS);
  const [timerHidden, setTimerHidden] = useState(false);
  const [counterHidden, setCounterHidden] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [done, setDone] = useState(false);
  const [resultFlash, setResultFlash] = useState<{
    letter: string;
    kind: "correct" | "wrong";
  } | null>(null);

  const total = PREVIEW_QUESTIONS.length;
  const question = PREVIEW_QUESTIONS[index];
  const qState = states[question.id] ?? emptyState();
  const locked = qState.solved || qState.revealed;
  const progressPct = ((index + 1) / total) * 100;

  const solvedCount = useMemo(
    () =>
      PREVIEW_QUESTIONS.filter((q) => {
        const s = states[q.id];
        return s?.solved || s?.revealed;
      }).length,
    [states],
  );

  const correctFirstTryCount = useMemo(
    () =>
      PREVIEW_QUESTIONS.filter((q) => {
        const s = states[q.id];
        return s?.solved && s.incorrect.length === 0 && !s.revealed;
      }).length,
    [states],
  );

  const unfinishedCount = useMemo(
    () =>
      PREVIEW_QUESTIONS.filter((q) => {
        const status = navStatus(states[q.id]);
        return status === "unseen" || status === "incomplete";
      }).length,
    [states],
  );

  useEffect(() => {
    const id = PREVIEW_QUESTIONS[index]?.id;
    if (!id) return;
    setStates((prev) => {
      const cur = prev[id] ?? emptyState();
      if (cur.visited) return prev;
      return { ...prev, [id]: { ...cur, visited: true } };
    });
  }, [index]);

  useEffect(() => {
    document.documentElement.classList.add("esat-ui-preview-active");
    return () => {
      document.documentElement.classList.remove("esat-ui-preview-active");
    };
  }, []);

  useEffect(() => {
    if (done) return;
    const timer = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timer);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [done]);

  const patchState = useCallback(
    (id: string, patch: Partial<QuestionState>) => {
      setStates((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? emptyState()), ...patch },
      }));
    },
    [],
  );

  const selectOption = (label: string) => {
    if (locked) return;
    if (qState.incorrect.includes(label)) return;
    patchState(question.id, { selected: label });
  };

  const submitAnswer = () => {
    if (!qState.selected || locked) return;
    if (qState.incorrect.includes(qState.selected)) return;
    const answer = qState.selected;
    const correct = answer === question.correct_option;
    setResultFlash({ letter: answer, kind: correct ? "correct" : "wrong" });
    window.setTimeout(() => setResultFlash(null), 550);
    if (correct) {
      patchState(question.id, { solved: true, selected: answer });
    } else {
      patchState(question.id, {
        incorrect: [...qState.incorrect, answer],
        selected: null,
      });
    }
  };

  const revealAnswer = () => {
    if (locked) return;
    setResultFlash({
      letter: question.correct_option,
      kind: "correct",
    });
    window.setTimeout(() => setResultFlash(null), 550);
    patchState(question.id, {
      revealed: true,
      selected: question.correct_option,
    });
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    setIndex(next);
    setNavigatorOpen(false);
    setShowExplanation(false);
    setResultFlash(null);
  };

  const goNext = () => {
    if (index >= total - 1) {
      setDone(true);
      return;
    }
    goTo(index + 1);
  };

  const canProceed = locked;
  const canSubmit =
    !!qState.selected &&
    !qState.incorrect.includes(qState.selected) &&
    !locked;

  if (done) {
    return (
      <div
        className="esat-ui-preview-root"
        data-theme={isDark ? "dark" : "light"}
        role="application"
        aria-label="ESAT UI preview results"
      >
        <header className="eup-header">
          <div className="eup-header-left">
            <div className="eup-header-title">ESAT UI preview · Math 1</div>
            <button
              type="button"
              className="eup-theme-toggle"
              onClick={toggleShellTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun size={15} strokeWidth={2} aria-hidden />
              ) : (
                <Moon size={15} strokeWidth={2} aria-hidden />
              )}
              <span>{isDark ? "Light" : "Dark"}</span>
            </button>
          </div>
        </header>
        <div className="eup-toolbar" />
        <div className="eup-progress">
          <div className="eup-progress-fill" style={{ width: "100%" }} />
        </div>
        <div className="eup-main">
          <div className="eup-done">
            <p style={{ color: "var(--eup-accent)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
              Preview complete
            </p>
            <h1>Session finished</h1>
            <div className="eup-done-score">
              {correctFirstTryCount}/{total}
            </div>
            <p>
              First-try correct answers. {solvedCount} of {total} questions
              marked or revealed. This route is a UI sandbox only; it does not
              save attempts.
            </p>
            <div className="eup-done-actions">
              <button
                type="button"
                className="eup-done-btn eup-done-btn--primary"
                onClick={() => {
                  setStates(
                    Object.fromEntries(
                      PREVIEW_QUESTIONS.map((q) => [q.id, emptyState()]),
                    ),
                  );
                  setIndex(0);
                  setRemaining(TIME_LIMIT_SECONDS);
                  setDone(false);
                  setNavigatorOpen(false);
                  setShowExplanation(false);
                }}
              >
                Restart preview
              </button>
              <Link href="/questions" className="eup-done-btn">
                Back to question bank
              </Link>
              <Link href="/past-papers/pearson-demo" className="eup-done-btn">
                Official ESAT demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="esat-ui-preview-root"
      data-theme={isDark ? "dark" : "light"}
      role="application"
      aria-label="ESAT UI preview player"
    >
      <header className="eup-header">
        <div className="eup-header-left">
          <div className="eup-header-title">ESAT UI preview · Math 1</div>
          <button
            type="button"
            className="eup-theme-toggle"
            onClick={toggleShellTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun size={15} strokeWidth={2} aria-hidden />
            ) : (
              <Moon size={15} strokeWidth={2} aria-hidden />
            )}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
        </div>
        <div className="eup-header-right">
          <button
            type="button"
            className={cn(
              "eup-header-meta",
              timerHidden && "eup-header-meta--icon-only",
            )}
            onClick={() => setTimerHidden((v) => !v)}
            aria-label={timerHidden ? "Show time remaining" : "Hide time remaining"}
            aria-pressed={timerHidden}
          >
            <Clock size={18} strokeWidth={2} aria-hidden />
            {!timerHidden ? (
              <span>Time Remaining {formatClock(remaining)}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={cn(
              "eup-header-meta",
              counterHidden && "eup-header-meta--icon-only",
            )}
            onClick={() => setCounterHidden((v) => !v)}
            aria-label={
              counterHidden ? "Show question counter" : "Hide question counter"
            }
            aria-pressed={counterHidden}
          >
            <Hash size={18} strokeWidth={2} aria-hidden />
            {!counterHidden ? (
              <span>
                {index + 1} of {total}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="eup-toolbar">
        <div className="eup-toolbar-pills">
          <span
            className={cn(
              "eup-pill",
              DIFFICULTY_LABEL[question.difficulty].className,
            )}
          >
            {DIFFICULTY_LABEL[question.difficulty].label}
          </span>
          <span className="eup-pill eup-pill--subject">Math 1</span>
        </div>
        <div className="eup-toolbar-actions">
          <button
            type="button"
            className="eup-toolbar-btn"
            aria-pressed={qState.flagged}
            onClick={() =>
              patchState(question.id, { flagged: !qState.flagged })
            }
          >
            <Flag
              size={17}
              strokeWidth={2}
              fill={qState.flagged ? "currentColor" : "none"}
              aria-hidden
            />
            <span>Flag for Review</span>
          </button>
          <span className="eup-toolbar-divider" aria-hidden />
          <button
            type="button"
            className="eup-toolbar-btn"
            onClick={revealAnswer}
            disabled={locked}
          >
            <Eye size={17} strokeWidth={2} aria-hidden />
            <span>Reveal answer</span>
          </button>
          <span className="eup-toolbar-divider" aria-hidden />
          <button
            type="button"
            className="eup-toolbar-btn"
            onClick={() => setShowExplanation(true)}
            disabled={!locked}
            title={
              locked
                ? "View explanation"
                : "Solve or reveal the answer first"
            }
          >
            <span>Explanation</span>
          </button>
        </div>
      </div>

      <div
        className="eup-progress"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label="Session progress"
      >
        <div className="eup-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="eup-main">
        <div className="eup-viewport">
          <div className="eup-question-row">
            <span className="eup-qnum" aria-label={`Question ${index + 1}`}>
              {index + 1}.
            </span>
            <div className="eup-stem">
              <StemContent
                content={question.question_text_markdown}
                className="text-inherit"
              />
              {question.diagram_svg ? (
                <div className="eup-stem-diagram">
                  <StemContent
                    content={question.diagram_svg}
                    className="text-inherit"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <ul className="eup-radio-list" role="radiogroup" aria-label="Answer options">
            {question.options.map((option) => {
              const isCorrectOption = option.label === question.correct_option;
              const wasWrong = qState.incorrect.includes(option.label);
              const isSelected = qState.selected === option.label;
              const showCorrect =
                (qState.solved && isCorrectOption) ||
                (qState.revealed && isCorrectOption);
              const isFlashing = resultFlash?.letter === option.label;
              const flashCorrect =
                isFlashing && resultFlash?.kind === "correct";
              const flashWrong = isFlashing && resultFlash?.kind === "wrong";

              return (
                <li key={option.label}>
                  <label
                    className={cn(
                      "eup-radio-row",
                      isSelected && "eup-radio-row--selected",
                      showCorrect && "eup-radio-row--correct",
                      wasWrong && "eup-radio-row--wrong",
                      locked && "eup-radio-row--locked",
                      locked && !showCorrect && !wasWrong && "eup-radio-row--dim",
                      flashCorrect && "eup-radio-row--flash-correct",
                      flashWrong && "eup-radio-row--flash-wrong",
                    )}
                  >
                    <span className="eup-radio-control">
                      <input
                        type="radio"
                        name={`eup-${question.id}`}
                        value={option.label}
                        checked={isSelected || showCorrect}
                        disabled={locked || wasWrong}
                        onChange={() => selectOption(option.label)}
                      />
                    </span>
                    <span className="eup-radio-body">
                      <StemContent
                        content={option.text_markdown}
                        className="text-inherit inline"
                      />
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        {navigatorOpen ? (
          <div
            className="eup-nav-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setNavigatorOpen(false);
            }}
          >
            <div
              className="eup-nav-window"
              role="dialog"
              aria-modal="true"
              aria-label="Navigator"
            >
              <div className="eup-nav-window-header">
                <Grid3X3 size={16} strokeWidth={2} aria-hidden />
                <span>Navigator - select a question to go to it</span>
              </div>

              <div className="eup-nav-window-body">
                <table className="eup-nav-table">
                  <thead>
                    <tr>
                      <th>
                        Question # <span aria-hidden="true">▲</span>
                      </th>
                      <th>Status</th>
                      <th>Flagged for Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_QUESTIONS.map((q, i) => {
                      const s = states[q.id];
                      const status = navStatus(s);
                      return (
                        <tr
                          key={q.id}
                          className={cn(
                            i === index && "eup-nav-row--current",
                            status === "correct" && "eup-nav-row--correct",
                            status === "incorrect" && "eup-nav-row--incorrect",
                          )}
                        >
                          <td>
                            <button
                              type="button"
                              className="eup-nav-link"
                              onClick={() => goTo(i)}
                            >
                              Question {i + 1}
                            </button>
                          </td>
                          <td
                            className={cn(
                              "eup-nav-status",
                              `eup-nav-status--${status}`,
                            )}
                          >
                            {navStatusLabel(status)}
                          </td>
                          <td className="eup-nav-flag-cell">
                            {s?.flagged ? (
                              <span
                                className="eup-nav-flag"
                                aria-label="Flagged"
                              />
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="eup-nav-window-footer">
                <span>{unfinishedCount} Unseen/Incomplete</span>
                <button
                  type="button"
                  className="eup-nav-close"
                  onClick={() => setNavigatorOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="eup-footer">
        <button
          type="button"
          className="eup-footer-action"
          onClick={() => setDone(true)}
        >
          <LogOut size={19} strokeWidth={2} aria-hidden />
          <span>End Preview</span>
        </button>
        <span className="eup-footer-rule" aria-hidden />
        <div className="eup-footer-group eup-footer-group--right">
          <button
            type="button"
            className="eup-footer-action"
            onClick={() => goTo(index - 1)}
            disabled={index <= 0}
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
            <span>Previous</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          <button
            type="button"
            className="eup-footer-action"
            onClick={() => setNavigatorOpen(true)}
          >
            <Grid3X3 size={19} strokeWidth={2} aria-hidden />
            <span>Navigator</span>
          </button>
          <span className="eup-footer-rule" aria-hidden />
          {canSubmit ? (
            <button
              type="button"
              className="eup-footer-action eup-footer-action--primary"
              onClick={submitAnswer}
            >
              <span>Check answer</span>
            </button>
          ) : (
            <button
              type="button"
              className="eup-footer-action eup-footer-action--primary"
              onClick={goNext}
              disabled={!canProceed && index < total - 1}
              title={
                canProceed
                  ? undefined
                  : "Check or reveal the answer before continuing"
              }
            >
              <span>{index >= total - 1 ? "Finish" : "Next"}</span>
              <ChevronRight size={22} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </footer>

      {showExplanation ? (
        <div
          className="eup-explain-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowExplanation(false);
          }}
        >
          <div
            className="eup-explain-window"
            role="dialog"
            aria-modal="true"
            aria-labelledby="eup-explain-title"
          >
            <div className="eup-explain-header">
              <h2 id="eup-explain-title">Explanation</h2>
              <button
                type="button"
                className="eup-explain-close"
                onClick={() => setShowExplanation(false)}
              >
                Close
              </button>
            </div>
            <div className="eup-explain-body">
              <StemContent
                content={solutionMarkdown(question)}
                className="eup-explain-content"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
