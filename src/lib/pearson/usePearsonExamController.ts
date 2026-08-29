"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Letter, Question } from "@/types/papers";
import {
  buildNavigatorRows,
  emptyAnswerMap,
  emptyBoolMap,
  emptyFlagMap,
  listFlaggedAndUnanswered,
  markViewedToEnd,
  markVisited,
  needsUnseenContentWarning,
  persistColourScheme,
  resolveStrictShortcut,
  setAnswer,
  stepZoom,
  toggleFlag,
} from "./examBehaviours";
import { DEFAULT_COLOUR_SCHEME } from "./colourSchemes";
import {
  formatRemainingMs,
  isModuleTimeExpired,
  remainingMs,
  startFreshModuleDeadline,
  unusedMsAtEnd,
} from "./timer";
import type {
  ColourSchemeId,
  ExamMode,
  ExamScreen,
  ModuleTransitionConfig,
  PearsonAnswerMap,
  PearsonFlagMap,
  PearsonModuleResult,
  ZoomLevel,
} from "./types";
import { INSTRUCTION_READ_MS, MODULE_DURATION_MS } from "./types";

/** Blurred spinner after End Exam / End Module confirm (specimen player). */
export const SESSION_ENDING_MS = 2800;

/** Skip loading + NDA; open straight on the 1-minute instruction screen. */
export type PearsonIntroMode = "full" | "section-only";

export interface UsePearsonExamControllerOptions {
  mode: ExamMode;
  questions: Question[];
  initialAnswers?: PearsonAnswerMap;
  initialFlags?: PearsonFlagMap;
  timeLimitSeconds?: number;
  moduleTransition?: ModuleTransitionConfig;
  introMode?: PearsonIntroMode;
  /** When true, session-ending calls onModuleComplete without the Module ended screen. */
  suppressCompleteScreen?: boolean;
  sectionHeading?: string;
  onModuleComplete: (result: PearsonModuleResult) => void;
  onAnswerChange?: (answers: PearsonAnswerMap) => void;
  onFlagsChange?: (flags: PearsonFlagMap) => void;
}

export function usePearsonExamController(
  options: UsePearsonExamControllerOptions,
) {
  const {
    mode,
    questions,
    initialAnswers,
    initialFlags,
    timeLimitSeconds = MODULE_DURATION_MS / 1000,
    moduleTransition = { enabled: false },
    introMode = "full",
    suppressCompleteScreen = false,
    sectionHeading,
    onModuleComplete,
    onAnswerChange,
    onFlagsChange,
  } = options;

  const durationMs = timeLimitSeconds * 1000;
  const onCompleteRef = useRef(onModuleComplete);
  onCompleteRef.current = onModuleComplete;
  const suppressCompleteScreenRef = useRef(suppressCompleteScreen);
  suppressCompleteScreenRef.current = suppressCompleteScreen;
  const onAnswerChangeRef = useRef(onAnswerChange);
  onAnswerChangeRef.current = onAnswerChange;
  const onFlagsChangeRef = useRef(onFlagsChange);
  onFlagsChangeRef.current = onFlagsChange;

  const [screen, setScreen] = useState<ExamScreen>(() =>
    introMode === "section-only" ? "instructions" : "loading",
  );
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<PearsonAnswerMap>(() => ({
    ...emptyAnswerMap(questions),
    ...initialAnswers,
  }));
  const [flagged, setFlagged] = useState<PearsonFlagMap>(() => ({
    ...emptyFlagMap(questions),
    ...initialFlags,
  }));
  const [viewedToEnd, setViewedToEnd] = useState(() => emptyBoolMap(questions));
  const [visited, setVisited] = useState(() => {
    const base = emptyBoolMap(questions);
    if (questions[0]) base[questions[0].id] = true;
    return base;
  });
  const [moduleDeadline, setModuleDeadline] = useState<number | null>(null);
  const [instructionDeadline, setInstructionDeadline] = useState<number | null>(
    () => (introMode === "section-only" ? Date.now() + INSTRUCTION_READ_MS : null),
  );
  const [completed, setCompleted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [colourScheme, setColourScheme] =
    useState<ColourSchemeId>(DEFAULT_COLOUR_SCHEME);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [pendingNavIndex, setPendingNavIndex] = useState<number | null>(null);
  const [endExamReturnScreen, setEndExamReturnScreen] = useState<ExamScreen>(
    () => (introMode === "section-only" ? "instructions" : "nda"),
  );
  const [questionCounterHidden, setQuestionCounterHidden] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;
  const inQuestionPhase =
    screen === "question" ||
    screen === "unseen-content-warning" ||
    screen === "end-exam-confirmation" ||
    screen === "end-module-confirmation" ||
    screen === "review";

  // Tick while instruction or module clock is running.
  useEffect(() => {
    if (completed) return;
    if (moduleDeadline == null && instructionDeadline == null) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [completed, instructionDeadline, moduleDeadline]);

  const activeTimerDeadline =
    screen === "instructions" && instructionDeadline != null
      ? instructionDeadline
      : moduleDeadline;
  const remaining = activeTimerDeadline
    ? remainingMs(activeTimerDeadline, nowTick)
    : 0;
  const remainingLabel = formatRemainingMs(remaining);

  const finishModule = useCallback(() => {
    if (completed || screen === "session-ending") return;
    setNavigatorOpen(false);
    setScreen("session-ending");
  }, [completed, screen]);

  useEffect(() => {
    if (screen !== "session-ending" || completed) return;

    const endAt = Date.now();
    const deadline = moduleDeadline ?? endAt;

    const id = window.setTimeout(() => {
      const unused = unusedMsAtEnd(deadline, endAt);
      setCompleted(true);
      onCompleteRef.current({
        answers,
        flagged,
        remainingMsAtEnd: unused,
        unusedMs: unused,
        completedAt: endAt,
      });
      if (!suppressCompleteScreenRef.current) {
        setScreen(
          moduleTransition.enabled && mode !== "strict-simulation"
            ? "module-transition"
            : "complete",
        );
      }
    }, SESSION_ENDING_MS);

    return () => window.clearTimeout(id);
  }, [
    answers,
    completed,
    flagged,
    mode,
    moduleDeadline,
    moduleTransition.enabled,
    screen,
  ]);

  useEffect(() => {
    if (completed || moduleDeadline == null || timeExpired) return;
    if (isModuleTimeExpired(moduleDeadline, nowTick)) {
      setTimeExpired(true);
      setNavigatorOpen(false);
      setScreen("review");
    }
  }, [completed, moduleDeadline, nowTick, timeExpired]);

  const completeLoading = useCallback(() => {
    setScreen("nda");
  }, []);

  const goToQuestionIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      const q = questions[index];
      setCurrentQuestionIndex(index);
      setVisited((prev) => markVisited(prev, q.id));
      setScreen("question");
      setNavigatorOpen(false);
      setPendingNavIndex(null);
    },
    [questions],
  );

  const startQuestions = useCallback(() => {
    setInstructionDeadline(null);
    if (moduleDeadline == null) {
      setModuleDeadline(startFreshModuleDeadline(Date.now(), durationMs));
    }
    goToQuestionIndex(0);
  }, [durationMs, goToQuestionIndex, moduleDeadline]);

  useEffect(() => {
    if (screen !== "instructions" || instructionDeadline == null || completed) {
      return;
    }
    if (isModuleTimeExpired(instructionDeadline, nowTick)) {
      startQuestions();
    }
  }, [completed, instructionDeadline, nowTick, screen, startQuestions]);

  const moduleLocked = completed || timeExpired;

  const tryNavigateTo = useCallback(
    (index: number) => {
      if (moduleLocked) return;
      if (!currentQuestion) {
        goToQuestionIndex(index);
        return;
      }
      if (needsUnseenContentWarning(currentQuestion.id, viewedToEnd)) {
        setPendingNavIndex(index);
        setNavigatorOpen(false);
        setScreen("unseen-content-warning");
        return;
      }
      goToQuestionIndex(index);
    },
    [moduleLocked, currentQuestion, goToQuestionIndex, viewedToEnd],
  );

  const dismissUnseenContent = useCallback(() => {
    setScreen("question");
    setPendingNavIndex(null);
  }, []);

  const advanceFlow = useCallback(() => {
    if (screen === "nda") {
      setInstructionDeadline(Date.now() + INSTRUCTION_READ_MS);
      setScreen("instructions");
      return;
    }
    if (screen === "instructions") {
      startQuestions();
      return;
    }
  }, [screen, startQuestions]);

  const goNext = useCallback(() => {
    if (screen === "nda" || screen === "instructions") {
      advanceFlow();
      return;
    }
    if (moduleLocked) return;
    if (currentQuestionIndex >= totalQuestions - 1) {
      if (
        currentQuestion &&
        needsUnseenContentWarning(currentQuestion.id, viewedToEnd)
      ) {
        setNavigatorOpen(false);
        setScreen("unseen-content-warning");
        return;
      }
      setNavigatorOpen(false);
      setScreen("review");
      return;
    }
    tryNavigateTo(currentQuestionIndex + 1);
  }, [
    screen,
    advanceFlow,
    moduleLocked,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    tryNavigateTo,
    viewedToEnd,
  ]);

  const openNavigator = useCallback(() => {
    if (!inQuestionPhase || moduleLocked) return;
    if (
      currentQuestion &&
      needsUnseenContentWarning(currentQuestion.id, viewedToEnd)
    ) {
      setPendingNavIndex(null);
      setScreen("unseen-content-warning");
      return;
    }
    setNavigatorOpen(true);
  }, [inQuestionPhase, moduleLocked, currentQuestion, viewedToEnd]);

  const closeNavigator = useCallback(() => {
    setNavigatorOpen(false);
  }, []);

  const requestEndExam = useCallback(() => {
    if (completed) return;
    setNavigatorOpen(false);
    setEndExamReturnScreen(
      screen === "instructions"
        ? "instructions"
        : screen === "question" ||
            screen === "unseen-content-warning" ||
            moduleDeadline != null
          ? "question"
          : "nda",
    );
    setScreen("end-exam-confirmation");
  }, [completed, moduleDeadline, screen]);

  const confirmEndExam = useCallback(() => {
    finishModule();
  }, [finishModule]);

  const cancelEndExam = useCallback(() => {
    setScreen(endExamReturnScreen);
  }, [endExamReturnScreen]);

  const requestEndReview = useCallback(() => {
    if (completed) return;
    setNavigatorOpen(false);
    setScreen("end-module-confirmation");
  }, [completed]);

  const confirmEndModule = useCallback(() => {
    finishModule();
  }, [finishModule]);

  const cancelEndModule = useCallback(() => {
    setScreen("review");
  }, []);

  const selectAnswer = useCallback(
    (choice: Letter | null) => {
      if (!currentQuestion || moduleLocked) return;
      setAnswers((prev) => {
        const next = setAnswer(prev, currentQuestion.id, choice, moduleLocked);
        onAnswerChangeRef.current?.(next);
        return next;
      });
    },
    [moduleLocked, currentQuestion],
  );

  const toggleCurrentFlag = useCallback(() => {
    if (!currentQuestion || moduleLocked) return;
    setFlagged((prev) => {
      const next = toggleFlag(prev, currentQuestion.id, moduleLocked);
      onFlagsChangeRef.current?.(next);
      return next;
    });
  }, [moduleLocked, currentQuestion]);

  const onViewportViewedToEnd = useCallback(() => {
    if (!currentQuestion) return;
    setViewedToEnd((prev) => markViewedToEnd(prev, currentQuestion.id));
  }, [currentQuestion]);

  const changeColourScheme = useCallback((id: ColourSchemeId) => {
    setColourScheme((prev) => persistColourScheme(prev, id));
  }, []);

  const toggleQuestionCounterHidden = useCallback(() => {
    setQuestionCounterHidden((hidden) => !hidden);
  }, []);

  const toggleTimerHidden = useCallback(() => {
    setTimerHidden((hidden) => !hidden);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((z) => stepZoom(z, "in"));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((z) => stepZoom(z, "out"));
  }, []);

  const handleVerifiedHotkey = useCallback(
    (
      e: Pick<
        KeyboardEvent,
        "altKey" | "ctrlKey" | "metaKey" | "key" | "code" | "preventDefault"
      >,
    ) => {
      if (completed || screen === "session-ending") return false;
      const endExamDialogOpen = screen === "end-exam-confirmation" || screen === "end-module-confirmation";
      const action = resolveStrictShortcut(mode, e, {
        endExamDialogOpen,
        navigatorOpen,
        unseenContentDialogOpen: screen === "unseen-content-warning",
      });
      if (!action) return false;
      e.preventDefault();
      if (action === "ok") dismissUnseenContent();
      else if (action === "next") goNext();
      else if (action === "flag") toggleCurrentFlag();
      else if (action === "end-exam") requestEndExam();
      else if (action === "close") closeNavigator();
      else if (action === "yes") {
        if (screen === "end-exam-confirmation") confirmEndExam();
        else if (screen === "end-module-confirmation") confirmEndModule();
      } else if (action === "no") {
        if (screen === "end-exam-confirmation") cancelEndExam();
        else if (screen === "end-module-confirmation") cancelEndModule();
      } else if (action === "zoom-in") zoomIn();
      else if (action === "zoom-out") zoomOut();
      return true;
    },
    [
      cancelEndExam,
      cancelEndModule,
      closeNavigator,
      completed,
      confirmEndExam,
      confirmEndModule,
      dismissUnseenContent,
      goNext,
      mode,
      navigatorOpen,
      requestEndExam,
      screen,
      toggleCurrentFlag,
      zoomIn,
      zoomOut,
    ],
  );

  const navigatorRows = useMemo(
    () => buildNavigatorRows(questions, answers, flagged, visited),
    [answers, flagged, questions, visited],
  );

  const reviewLists = useMemo(
    () => listFlaggedAndUnanswered(questions, answers, flagged),
    [answers, flagged, questions],
  );

  const unseenIncompleteCount = useMemo(
    () =>
      navigatorRows.filter(
        (r) => r.status === "unseen" || r.status === "incomplete",
      ).length,
    [navigatorRows],
  );

  const currentFlagged = currentQuestion
    ? Boolean(flagged[currentQuestion.id])
    : false;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;

  const showQuestionCounter = inQuestionPhase && screen !== "review";
  const showTimer =
    (screen === "instructions" && instructionDeadline != null) ||
    (moduleDeadline != null && showQuestionCounter);
  const showFlagToolbar = screen === "question" && !navigatorOpen;
  const showPrequestionFooter =
    screen === "nda" ||
    screen === "instructions" ||
    (screen === "end-exam-confirmation" && moduleDeadline == null);
  const showQuestionFooter =
    screen === "question" ||
    screen === "unseen-content-warning" ||
    (screen === "end-exam-confirmation" && moduleDeadline != null);

  return {
    mode,
    screen,
    navigatorOpen,
    questions,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    answers,
    flagged,
    viewedToEnd,
    visited,
    completed,
    timeExpired,
    moduleLocked,
    colourScheme,
    zoomLevel,
    moduleDeadline,
    instructionDeadline,
    timeLimitMinutes: Math.round(durationMs / 60000),
    remainingMs: remaining,
    remainingLabel,
    moduleTransition,
    sectionHeading,
    pendingNavIndex,
    navigatorRows,
    reviewLists,
    unseenIncompleteCount,
    currentFlagged,
    currentAnswer,
    showQuestionCounter,
    questionCounterHidden,
    showTimer,
    timerHidden,
    showFlagToolbar,
    showPrequestionFooter,
    showQuestionFooter,
    inQuestionPhase,
    completeLoading,
    goNext,
    tryNavigateTo,
    goToQuestionIndex,
    openNavigator,
    closeNavigator,
    requestEndExam,
    confirmEndExam,
    cancelEndExam,
    requestEndReview,
    confirmEndModule,
    cancelEndModule,
    dismissUnseenContent,
    selectAnswer,
    toggleCurrentFlag,
    onViewportViewedToEnd,
    changeColourScheme,
    toggleQuestionCounterHidden,
    toggleTimerHidden,
    zoomIn,
    zoomOut,
    handleVerifiedHotkey,
  };
}

export type PearsonExamController = ReturnType<typeof usePearsonExamController>;
