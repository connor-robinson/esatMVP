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
import { MODULE_DURATION_MS } from "./types";

export interface UsePearsonExamControllerOptions {
  mode: ExamMode;
  questions: Question[];
  initialAnswers?: PearsonAnswerMap;
  initialFlags?: PearsonFlagMap;
  timeLimitSeconds?: number;
  /** Default false in strict-simulation (no invented break countdown). */
  moduleTransition?: ModuleTransitionConfig;
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
    onModuleComplete,
    onAnswerChange,
    onFlagsChange,
  } = options;

  const durationMs = timeLimitSeconds * 1000;
  const onCompleteRef = useRef(onModuleComplete);
  onCompleteRef.current = onModuleComplete;
  const onAnswerChangeRef = useRef(onAnswerChange);
  onAnswerChangeRef.current = onAnswerChange;
  const onFlagsChangeRef = useRef(onFlagsChange);
  onFlagsChangeRef.current = onFlagsChange;

  const [screen, setScreen] = useState<ExamScreen>("question");
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
  const [moduleDeadline, setModuleDeadline] = useState<number | null>(() =>
    startFreshModuleDeadline(Date.now(), durationMs),
  );
  const [completed, setCompleted] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [timerHidden, setTimerHidden] = useState(false);
  const [colourScheme, setColourScheme] =
    useState<ColourSchemeId>(DEFAULT_COLOUR_SCHEME);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [pendingNavIndex, setPendingNavIndex] = useState<number | null>(null);
  const [pendingEndReview, setPendingEndReview] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const currentQuestion = questions[currentQuestionIndex] ?? null;
  const totalQuestions = questions.length;

  // Tick the timer once per second while the module is active.
  useEffect(() => {
    if (completed || moduleDeadline == null) return;
    const id = window.setInterval(() => {
      setNowTick(Date.now());
    }, 250);
    return () => window.clearInterval(id);
  }, [completed, moduleDeadline]);

  const remaining = moduleDeadline
    ? remainingMs(moduleDeadline, nowTick)
    : 0;
  const remainingLabel = formatRemainingMs(remaining);

  const finishModule = useCallback(() => {
    if (completed) return;
    const endAt = Date.now();
    const deadline = moduleDeadline ?? endAt;
    const unused = unusedMsAtEnd(deadline, endAt);
    setCompleted(true);
    setScreen(
      moduleTransition.enabled && mode !== "strict-simulation"
        ? "module-transition"
        : "complete",
    );
    onCompleteRef.current({
      answers,
      flagged,
      remainingMsAtEnd: unused,
      unusedMs: unused,
      completedAt: endAt,
    });
  }, [
    answers,
    completed,
    flagged,
    mode,
    moduleDeadline,
    moduleTransition.enabled,
  ]);

  // Time expiry: lock answers and open Item Review (VERIFIED_ESAT end-of-module flow).
  useEffect(() => {
    if (completed || moduleDeadline == null || timeExpired) return;
    if (isModuleTimeExpired(moduleDeadline, nowTick)) {
      setTimeExpired(true);
      setScreen("review");
    }
  }, [completed, moduleDeadline, nowTick, timeExpired]);

  const goToQuestionIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      const q = questions[index];
      setCurrentQuestionIndex(index);
      setVisited((prev) => markVisited(prev, q.id));
      setScreen("question");
      setPendingNavIndex(null);
      setPendingEndReview(false);
    },
    [questions],
  );

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
        setPendingEndReview(false);
        setScreen("unseen-content-warning");
        return;
      }
      goToQuestionIndex(index);
    },
    [moduleLocked, currentQuestion, goToQuestionIndex, viewedToEnd],
  );

  const dismissUnseenContent = useCallback(() => {
    // OK acknowledges the warning; candidate stays on the current question
    // until they scroll/view to the end (handbook: make sure you scroll...).
    setScreen("question");
    setPendingNavIndex(null);
    setPendingEndReview(false);
  }, []);

  const goNext = useCallback(() => {
    if (moduleLocked) return;
    if (currentQuestionIndex >= totalQuestions - 1) {
      // Last question: open Item Review (VERIFIED_PEARSON_PLATFORM flow).
      if (
        currentQuestion &&
        needsUnseenContentWarning(currentQuestion.id, viewedToEnd)
      ) {
        setPendingNavIndex(null);
        setPendingEndReview(false);
        setScreen("unseen-content-warning");
        return;
      }
      setScreen("review");
      return;
    }
    tryNavigateTo(currentQuestionIndex + 1);
  }, [
    moduleLocked,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    tryNavigateTo,
    viewedToEnd,
  ]);

  const goPrevious = useCallback(() => {
    if (moduleLocked) return;
    if (currentQuestionIndex <= 0) return;
    tryNavigateTo(currentQuestionIndex - 1);
  }, [moduleLocked, currentQuestionIndex, tryNavigateTo]);

  const openNavigator = useCallback(() => {
    if (moduleLocked) return;
    if (
      currentQuestion &&
      needsUnseenContentWarning(currentQuestion.id, viewedToEnd)
    ) {
      setPendingNavIndex(null);
      setPendingEndReview(false);
      setScreen("unseen-content-warning");
      return;
    }
    setScreen("navigator");
  }, [moduleLocked, currentQuestion, viewedToEnd]);

  const closeNavigator = useCallback(() => {
    setScreen("question");
  }, []);

  const openReview = useCallback(() => {
    if (completed) return;
    setScreen("review");
  }, [completed]);

  const requestEndReview = useCallback(() => {
    if (completed) return;
    // From Item Review, End Review goes straight to confirmation
    // (VERIFIED_PEARSON_PLATFORM). Unseen Content already gated leaving items.
    setPendingEndReview(false);
    setPendingNavIndex(null);
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

  const toggleTimerHidden = useCallback(() => {
    setTimerHidden((v) => !v);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel((z) => stepZoom(z, "in"));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((z) => stepZoom(z, "out"));
  }, []);

  const handleVerifiedHotkey = useCallback(
    (e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "key" | "code" | "preventDefault">) => {
      if (moduleLocked) return false;
      const action = resolveStrictShortcut(mode, e);
      if (!action) return false;
      e.preventDefault();
      if (action === "next") goNext();
      else if (action === "zoom-in") zoomIn();
      else if (action === "zoom-out") zoomOut();
      return true;
    },
    [goNext, mode, moduleLocked, zoomIn, zoomOut],
  );

  const navigatorRows = useMemo(
    () => buildNavigatorRows(questions, answers, flagged, visited),
    [answers, flagged, questions, visited],
  );

  const reviewLists = useMemo(
    () => listFlaggedAndUnanswered(questions, answers, flagged),
    [answers, flagged, questions],
  );

  const currentFlagged = currentQuestion
    ? Boolean(flagged[currentQuestion.id])
    : false;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id] ?? null
    : null;

  return {
    mode,
    screen,
    setScreen,
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
    timerHidden,
    colourScheme,
    zoomLevel,
    moduleDeadline,
    remainingMs: remaining,
    remainingLabel,
    moduleTransition,
    pendingNavIndex,
    pendingEndReview,
    navigatorRows,
    reviewLists,
    currentFlagged,
    currentAnswer,
    goNext,
    goPrevious,
    tryNavigateTo,
    goToQuestionIndex,
    openNavigator,
    closeNavigator,
    openReview,
    requestEndReview,
    confirmEndModule,
    cancelEndModule,
    dismissUnseenContent,
    selectAnswer,
    toggleCurrentFlag,
    onViewportViewedToEnd,
    changeColourScheme,
    toggleTimerHidden,
    zoomIn,
    zoomOut,
    handleVerifiedHotkey,
  };
}

export type PearsonExamController = ReturnType<typeof usePearsonExamController>;
