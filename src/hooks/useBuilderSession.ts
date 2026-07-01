/**
 * Hook for managing builder session state and operations
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type {
  SessionPreset,
  BuilderSession,
  BuilderSessionConfig,
  GeneratedQuestion,
  QuestionAttempt,
  SessionLengthMode,
  TopicVariantSelection,
} from "@/types/core";
import type { SessionPresetInsert } from "@/lib/supabase/types";
import { generateMixedQuestions, generateQuestionForTopic, pickRandomDrill } from "@/lib/generators";
import { buildVariantLevelMap, levelForDrill } from "@/lib/drill-selection";
import { generateId } from "@/lib/utils";
import { getTopic } from "@/config/topics";
import { expressionsEqual } from "@/lib/answer-checker";
import { computeAttemptAccuracyStats } from "@/lib/session-stats";
import {
  loadDrillBuilderLengthPrefs,
  saveDrillBuilderLengthPrefs,
} from "@/lib/drillBuilderPreferences";

type ViewState = "builder" | "running" | "results";

/** Initial questions when length is not fixed (open-ended or time-based). */
const ON_DEMAND_SESSION_START_SIZE = 1;

const mapPresetRow = (row: any): SessionPreset => {
  const topicLevelsData = row.topic_levels as any;
  
  // Convert stored data to variant selections array
  let topicVariantSelections: TopicVariantSelection[] = [];
  let topicLevels: Record<string, number> | undefined;
  
  if (topicLevelsData && typeof topicLevelsData === 'object') {
    const entries = Object.entries(topicLevelsData);
    
    if (entries.length > 0) {
      // Check if it's variants (string values) or levels (number values)
      const isVariants = typeof entries[0][1] === 'string';
      
      if (isVariants) {
        // Convert Record<string, string> to TopicVariantSelection[]
        topicVariantSelections = entries.map(([topicId, variantId]) => ({
          topicId,
          variantId: variantId as string,
        }));
      } else {
        // Legacy: convert levels to variants
        topicLevels = topicLevelsData as Record<string, number>;
        const topicIds = row.topic_ids ?? [];
        topicVariantSelections = topicIds.map((topicId: string) => {
          const topic = getTopic(topicId);
          const level = topicLevels![topicId] || 1;
          if (topic && topic.variants) {
            const variant = topic.variants[level - 1] || topic.variants[0];
            if (variant) {
              return { topicId, variantId: variant.id };
            }
          }
          return { topicId, variantId: 'default' };
        }).filter(Boolean);
      }
    }
  }
  
  return {
    id: row.id,
    name: row.name,
    topics: row.topic_labels ?? row.topic_ids ?? [],
    topicIds: row.topic_ids ?? [],
    questionCount: row.question_count ?? 0,
    durationMin: row.duration_min ?? 0,
    topicVariantSelections,
    topicLevels, // Legacy support
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
};

export function useBuilderSession() {
  const supabase = useSupabaseClient();
  const authSession = useSupabaseSession();

  // UI state
  const [view, setView] = useState<ViewState>("builder");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Session configuration (length prefs restored from last visit)
  const [selectedTopicVariants, setSelectedTopicVariants] = useState<TopicVariantSelection[]>([]);
  const [initialLengthPrefs] = useState(loadDrillBuilderLengthPrefs);
  const [questionCount, setQuestionCount] = useState(
    initialLengthPrefs.questionCount,
  );
  const [sessionLengthMode, setSessionLengthMode] = useState<SessionLengthMode>(
    initialLengthPrefs.sessionLengthMode,
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initialLengthPrefs.timeLimitMinutes,
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const [presets, setPresets] = useState<SessionPreset[]>([]);

  // Running session state
  const [currentSession, setCurrentSession] = useState<BuilderSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuestionAttempt | null>(null);
  const [attemptLog, setAttemptLog] = useState<QuestionAttempt[]>([]);
  const [mode, setMode] = useState<"standard" | "mental-math">("standard");
  useEffect(() => {
    saveDrillBuilderLengthPrefs({
      sessionLengthMode,
      questionCount,
      timeLimitMinutes,
    });
  }, [sessionLengthMode, questionCount, timeLimitMinutes]);

  useEffect(() => {
    if (!authSession?.user) {
      setPresets([]);
      return;
    }

    supabase
      .from("session_presets")
      .select("*")
      .eq("user_id", authSession.user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          return;
        }
        setPresets((data ?? []).map(mapPresetRow));
      });
  }, [authSession?.user, supabase]);

  const canStart = selectedTopicVariants.length > 0;
  const currentQuestion = currentSession?.questions[currentQuestionIndex] || null;
  const isComplete = !!currentSession?.endedAt;
  const questionLimit = currentSession?.config?.questionLimit ?? questionCount;
  const isTimedSession = currentSession?.config?.sessionLengthMode === "time";
  const isOpenEndedQuestions =
    currentSession?.config?.sessionLengthMode === "questions" &&
    questionLimit === 0;
  const isUnlimitedTime =
    currentSession?.config?.sessionLengthMode === "time" &&
    (currentSession?.config?.timeLimitMinutes ?? 0) === 0;
  const isUnlimitedSession = isOpenEndedQuestions || isUnlimitedTime;
  const hasFiniteQuestionCap =
    currentSession?.config?.sessionLengthMode === "questions" &&
    questionLimit > 0;

  const progress = hasFiniteQuestionCap && currentSession?.questions.length
    ? currentQuestionIndex / Math.min(questionLimit, currentSession.questions.length)
    : 0;

  const displayTotalQuestions = hasFiniteQuestionCap
    ? Math.min(questionLimit, currentSession?.questions.length ?? questionLimit)
    : isUnlimitedSession
      ? 0
      : Math.max(
          currentQuestionIndex + 1,
          currentSession?.questions.length ?? 1,
        );
  
  const attemptAccuracyStats = useMemo(
    () => computeAttemptAccuracyStats(attemptLog),
    [attemptLog],
  );

  const correctAttempts = attemptAccuracyStats.correctAttempts;
  const totalAttempts = attemptAccuracyStats.totalAttempts;

  // Parse topicVariantId (e.g., "addition-single-digit" or "addition")
  const parseTopicVariantId = useCallback((topicVariantId: string): { topicId: string; variantId: string } | null => {
    // Check if it's in format "topicId-variantId"
    const parts = topicVariantId.split('-');
    if (parts.length >= 2) {
      // Try to find matching topic and variant
      // This is a bit tricky because topic IDs themselves might contain hyphens
      // So we try progressively shorter topic IDs
      for (let i = 1; i < parts.length; i++) {
        const possibleTopicId = parts.slice(0, i).join('-');
        const possibleVariantId = parts.slice(i).join('-');
        const topic = getTopic(possibleTopicId);
        if (topic && topic.variants?.some(v => v.id === possibleVariantId)) {
          return { topicId: possibleTopicId, variantId: possibleVariantId };
        }
      }
    }
    
    // Fallback: treat as topicId only, use first variant
    const topic = getTopic(topicVariantId);
    if (topic) {
      const variantId = topic.variants?.[0]?.id || 'default';
      return { topicId: topicVariantId, variantId };
    }
    
    return null;
  }, []);

  const addTopic = useCallback((topicVariantId: string, topicId: string, variantId?: string) => {
    const parsed = variantId 
      ? { topicId, variantId }
      : parseTopicVariantId(topicVariantId);
    
    if (!parsed) return;
    
    setSelectedTopicVariants((prev) => {
      // Check if this exact topic-variant pair already exists
      const exists = prev.some(
        tv => tv.topicId === parsed.topicId && tv.variantId === parsed.variantId
      );
      if (exists) return prev;
      
      return [...prev, parsed];
    });
  }, [parseTopicVariantId]);

  // Add all variants of a topic at once
  const addTopicWithAllVariants = useCallback((topicId: string) => {
    const topic = getTopic(topicId);
    if (!topic || !topic.variants || topic.variants.length === 0) return;
    
    setSelectedTopicVariants((prev) => {
      const newVariants: TopicVariantSelection[] = [];
      
      topic.variants?.forEach((variant) => {
        // Check if this variant is already added
        const exists = prev.some(
          tv => tv.topicId === topicId && tv.variantId === variant.id
        );
        if (!exists) {
          newVariants.push({ topicId, variantId: variant.id });
        }
      });
      
      return [...prev, ...newVariants];
    });
  }, []);

  const removeTopicVariant = useCallback((topicVariantId: string) => {
    const parsed = parseTopicVariantId(topicVariantId);
    if (!parsed) return;
    
    setSelectedTopicVariants((prev) => 
      prev.filter(
        tv => !(tv.topicId === parsed.topicId && tv.variantId === parsed.variantId)
      )
    );
  }, [parseTopicVariantId]);

  // Remove all variants of a specific topic
  const removeAllTopicVariants = useCallback((topicId: string) => {
    setSelectedTopicVariants((prev) => 
      prev.filter(tv => tv.topicId !== topicId)
    );
  }, []);

  const clearTopics = useCallback(() => {
    setSelectedTopicVariants([]);
  }, []);

  const createPreset = useCallback(
    (name: string) => {
      if (!authSession?.user) return;
      if (!name.trim() || selectedTopicVariants.length === 0) return;

      const presetId = generateId();
      
      // Get unique topic IDs
      const uniqueTopicIds = Array.from(new Set(selectedTopicVariants.map(tv => tv.topicId)));
      const topics = uniqueTopicIds.map(id => getTopic(id)?.name || id);
      
      const preset: SessionPreset = {
        id: presetId,
        name: name.trim(),
        topics,
        topicIds: uniqueTopicIds,
        questionCount,
        durationMin: questionCount,
        topicVariantSelections: [...selectedTopicVariants],
        createdAt: Date.now(),
      };

      // Convert variant selections to a map for storage
      const topicLevelsMap: Record<string, string> = {};
      selectedTopicVariants.forEach(({ topicId, variantId }) => {
        topicLevelsMap[topicId] = variantId;
      });

      const presetData: SessionPresetInsert = {
        id: presetId,
        user_id: authSession.user.id,
        name: preset.name,
        topic_ids: preset.topicIds,
        topic_labels: preset.topics,
        question_count: preset.questionCount,
        duration_min: preset.durationMin,
        // Store variants in topic_levels as JSON (will migrate to topic_variants column later)
        topic_levels: topicLevelsMap as any,
      };
      
      (supabase as any)
        .from("session_presets")
        .upsert(presetData)
        .then(({ error }: { error: any }) => {
          if (error) {
            return;
          }
          setPresets((prev) => [preset, ...prev.filter((p) => p.id !== preset.id)]);
        });
    },
    [authSession?.user, selectedTopicVariants, questionCount, supabase],
  );

  const loadPreset = useCallback((preset: SessionPreset) => {
    setQuestionCount(preset.durationMin);
    if (preset.topicVariantSelections && preset.topicVariantSelections.length > 0) {
      setSelectedTopicVariants([...preset.topicVariantSelections]);
    } else if (preset.topicLevels) {
      // Legacy: convert levels to variant selections
      const converted: TopicVariantSelection[] = [];
      preset.topicIds.forEach((topicId) => {
        const topic = getTopic(topicId);
        if (topic && topic.variants) {
          const level = preset.topicLevels![topicId] || 1;
          const variant = topic.variants[level - 1] || topic.variants[0];
          if (variant) {
            converted.push({ topicId, variantId: variant.id });
          }
        }
      });
      setSelectedTopicVariants(converted);
    } else {
      setSelectedTopicVariants([]);
    }
  }, []);

  const removePreset = useCallback(
    (presetId: string) => {
      if (!authSession?.user) return;
      supabase
        .from("session_presets")
        .delete()
        .eq("id", presetId)
        .eq("user_id", authSession.user.id)
        .then(({ error }) => {
          if (error) {
            return;
          }
          setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
        });
    },
    [authSession?.user, supabase],
  );

  const appendQuestionToSession = useCallback(
    (session: BuilderSession): BuilderSession => {
      const cfg = session.config;
      const selections = cfg?.topicVariantSelections ?? [];
      if (!cfg || selections.length === 0) return session;

      const pick =
        selections.length === 1
          ? selections[0]
          : pickRandomDrill(selections);
      const level = levelForDrill(
        cfg.variantToLevelMap,
        pick.topicId,
        pick.variantId,
      );
      const question = generateQuestionForTopic(
        pick.topicId,
        level,
        undefined,
        pick.variantId,
      );
      return { ...session, questions: [...session.questions, question] };
    },
    [],
  );

  const startSession = useCallback(() => {
    if (selectedTopicVariants.length === 0) {
      alert("Please add at least one topic to start a session.");
      return;
    }
    
    // Note: Allow starting session without auth for testing
    // if (!authSession?.user) {
    //   alert("Please log in to start a session.");
    //   return;
    // }

    // All mental-maths drill sessions use the drill results UI and attempt-based stats,
    // regardless of topic category (algebra, number theory, etc.).
    setMode("mental-math");

    const topicIds = Array.from(
      new Set(selectedTopicVariants.map((tv) => tv.topicId)),
    );
    const variantToLevelMap = buildVariantLevelMap(selectedTopicVariants);
    
    const config: BuilderSessionConfig = {
      sessionLengthMode,
      questionLimit: questionCount,
      timeLimitMinutes,
      topicIds,
      variantToLevelMap,
      topicVariantSelections: [...selectedTopicVariants],
    };

    const finiteQuestionSession =
      sessionLengthMode === "questions" && questionCount > 0;
    const poolSize = finiteQuestionSession
      ? questionCount
      : ON_DEMAND_SESSION_START_SIZE;

    const questions = generateMixedQuestions(
      selectedTopicVariants,
      poolSize,
      variantToLevelMap,
    );

    if (questions.length === 0) {
      alert("Failed to generate questions. Please try again.");
      return;
    }

    const sessionId = generateId();
    const startedAt = Date.now();
    const deadlineAt =
      sessionLengthMode === "time" && timeLimitMinutes > 0
        ? startedAt + timeLimitMinutes * 60 * 1000
        : null;

    const session: BuilderSession = {
      id: sessionId,
      questions,
      startedAt,
      attempts: 0,
      config,
      deadlineAt,
    };

    setCurrentSession(session);
    setCurrentQuestionIndex(0);
    setQuestionStartTime(Date.now());
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
    setView("running");

    // Only save to database if user is logged in
    if (authSession?.user) {
      // Create session first, then insert questions
      (async () => {
        try {
          const { data: sessionData, error: sessionError } = await (supabase as any)
            .from("builder_sessions")
            .insert({
              id: sessionId,
              user_id: authSession.user.id,
              started_at: new Date(startedAt).toISOString(),
              attempts: 0,
              settings: {
                selectedTopicVariants,
                questionCount,
                sessionLengthMode,
                timeLimitMinutes,
              },
            })
            .select("id")
            .single();

          if (sessionError) {
            return; // Don't try to insert questions if session creation failed
          }

          // Now insert questions after session is created
          if (questions.length > 0) {
            const rows = questions.map((q, index) => ({
              session_id: sessionId,
              user_id: authSession.user.id,
              order_index: index,
              question_id: q.id,
              topic_id: q.topicId,
              difficulty: q.difficulty,
              prompt: q.question,
              answer: String(q.answer),
              payload: q,
            }));

            const { data: questionsData, error: questionsError } = await (supabase as any)
              .from("builder_session_questions")
              .insert(rows)
              .select("id");

            if (questionsError) {
            }
          }
        } catch (error) {
        }
      })();
    }
  }, [
    authSession?.user,
    questionCount,
    sessionLengthMode,
    timeLimitMinutes,
    selectedTopicVariants,
    supabase,
  ]);

  const persistAttempt = useCallback(
    (sessionId: string, attempt: QuestionAttempt) => {
      if (!authSession?.user) {
        // Silently skip if no user session (anonymous mode)
        return;
      }
      // Find the order_index for this question from the session questions
      const question = currentSession?.questions.find(q => q.id === attempt.questionId);
      const orderIndex = currentSession?.questions.findIndex(q => q.id === attempt.questionId) ?? null;
      
      (supabase as any).from("builder_attempts").insert({
        session_id: sessionId,
        user_id: authSession.user.id,
        question_id: attempt.questionId,
        user_answer: String(attempt.answer),
        is_correct: attempt.isCorrect,
        time_spent_ms: attempt.timeSpent ?? null,
        attempted_at: new Date(attempt.timestamp).toISOString(),
        order_index: orderIndex !== null ? orderIndex : undefined,
      });
    },
    [authSession?.user, supabase, currentSession],
  );

  const finalizeSession = useCallback(
    async (sessionId: string, attempts: number) => {
      if (!authSession?.user || !currentSession) {
        return;
      }
      
      // Update builder_sessions table
      const { error: updateError } = await (supabase as any)
        .from("builder_sessions")
        .update({
          ended_at: new Date().toISOString(),
          attempts,
        })
        .eq("id", sessionId)
        .eq("user_id", authSession.user.id);

      if (updateError) {
        return;
      }

      // Save comprehensive analytics data
      const { saveSessionAnalytics } = await import("@/lib/analytics/session-saver");
      
      // Prepare question topics data (variantId is optional, not all questions have it)
      const questionTopics =
        attemptLog.length > 0
          ? attemptLog.map((attempt, index) => {
              const q =
                currentSession?.questions.find((q) => q.id === attempt.questionId) ??
                currentSession?.questions[index];
              return {
                topicId: q?.topicId ?? "unknown",
                variantId: q?.variantId,
                difficulty: q?.difficulty,
              };
            })
          : currentSession.questions.map((q) => ({
              topicId: q.topicId ?? "unknown",
              variantId: q.variantId,
              difficulty: q.difficulty,
            }));

      try {
        await saveSessionAnalytics(supabase, {
          sessionId,
          userId: authSession.user.id,
          session: currentSession,
          attempts: attemptLog,
          questionTopics,
          startedAt: currentSession?.startedAt || Date.now(),
          endedAt: Date.now(),
          sessionMode: mode,
        });
      } catch (error) {
        // Don't throw - we still want to show results even if analytics save fails
      }
    },
    [authSession?.user, supabase, currentSession, attemptLog, mode],
  );

  const finishSession = useCallback(
    (attemptsTotal: number) => {
      if (!currentSession) return;
      setCurrentSession((prev) =>
        prev ? { ...prev, attempts: attemptsTotal, endedAt: Date.now() } : prev,
      );
      setView("results");
      finalizeSession(currentSession.id, attemptsTotal);
    },
    [currentSession, finalizeSession],
  );

  const sessionTimeExpired = useCallback((session: BuilderSession) => {
    return (
      session.config?.sessionLengthMode === "time" &&
      session.deadlineAt != null &&
      Date.now() >= session.deadlineAt
    );
  }, []);

  const advanceToNextQuestion = useCallback(() => {
    if (!currentSession) return;

    if (sessionTimeExpired(currentSession)) {
      finishSession(currentSession.attempts);
      return;
    }

    const cfg = currentSession.config;
    const limit = cfg?.questionLimit ?? 0;
    const finiteQuestions =
      cfg?.sessionLengthMode === "questions" && limit > 0;
    const nextIndex = currentQuestionIndex + 1;

    if (finiteQuestions && nextIndex >= limit) {
      finishSession(currentSession.attempts);
      return;
    }

    let sessionForAdvance = currentSession;
    if (nextIndex >= sessionForAdvance.questions.length) {
      while (sessionForAdvance.questions.length <= nextIndex) {
        sessionForAdvance = appendQuestionToSession(sessionForAdvance);
      }
      setCurrentSession(sessionForAdvance);
    }

    setCurrentQuestionIndex(nextIndex);
    setQuestionStartTime(Date.now());
    setLastAttempt(null);
  }, [
    currentSession,
    currentQuestionIndex,
    sessionTimeExpired,
    finishSession,
    appendQuestionToSession,
  ]);

  /** Finish early, save analytics, and show results. */
  const endSession = useCallback(() => {
    if (!currentSession) return;
    finishSession(attemptLog.length);
  }, [currentSession, attemptLog.length, finishSession]);

  /** Abandon run without leaderboard / drill_session saves. */
  const discardSession = useCallback(() => {
    if (!currentSession) return;
    const sessionId = currentSession.id;

    if (authSession?.user) {
      void (supabase as any)
        .from("builder_sessions")
        .update({
          ended_at: new Date().toISOString(),
          attempts: attemptLog.length,
        })
        .eq("id", sessionId)
        .eq("user_id", authSession.user.id);
    }

    setView("builder");
    setCurrentSession(null);
    setCurrentQuestionIndex(0);
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
    setRemainingSeconds(null);
  }, [authSession?.user, attemptLog.length, currentSession, supabase]);

  const submitAnswer = useCallback(
    (userAnswer: string) => {
      if (!currentSession || !currentQuestion) return;

      if (sessionTimeExpired(currentSession)) {
        finishSession(currentSession.attempts);
        return;
      }

      const timeTakenMs = Date.now() - questionStartTime;
      
      // Use custom checker if provided, otherwise use mathematical equivalence checking
      let isCorrect: boolean;
      if (currentQuestion.checker) {
        isCorrect = currentQuestion.checker(userAnswer.trim());
      } else {
        const userTrimmed = userAnswer.trim();
        const correctTrimmed = String(currentQuestion.answer).trim();
        
        // First try exact string match
        if (userTrimmed === correctTrimmed) {
          isCorrect = true;
        } else {
          // Try mathematical equivalence (handles 2 = 2^1, 4 = 2^2, etc.)
          isCorrect = expressionsEqual(userTrimmed, correctTrimmed, 0.001);
        }
      }

      const attempt: QuestionAttempt = {
        questionId: currentQuestion.id,
        answer: userAnswer,
        isCorrect,
        timeSpent: timeTakenMs,
        timestamp: Date.now(),
      };

      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              attempts: prev.attempts + 1,
            }
          : prev,
      );
      setLastAttempt(attempt);
      setShowFeedback(true);
      setAttemptLog((prev) => [...prev, attempt]);
      persistAttempt(currentSession.id, attempt);

      if (isCorrect) {
        const delay = currentQuestion.metadata?.feedbackDurationMs ?? 80;
        setTimeout(() => {
          setShowFeedback(false);
          advanceToNextQuestion();
        }, delay);
      }
    },
    [
      currentSession,
      currentQuestion,
      questionStartTime,
      persistAttempt,
      sessionTimeExpired,
      finishSession,
      advanceToNextQuestion,
    ],
  );

  const continueAfterIncorrect = useCallback(() => {
    if (!currentSession || view !== "running") return;

    setShowFeedback(false);
    advanceToNextQuestion();
  }, [currentSession, view, advanceToNextQuestion]);

  const exitSession = useCallback(() => {
    setView("builder");
    setCurrentSession(null);
    setCurrentQuestionIndex(0);
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
    setRemainingSeconds(null);
  }, []);

  useEffect(() => {
    if (view !== "running" || !currentSession?.deadlineAt) {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((currentSession.deadlineAt! - Date.now()) / 1000),
      );
      setRemainingSeconds(left);
      if (left <= 0) {
        finishSession(currentSession.attempts);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [view, currentSession?.deadlineAt, currentSession?.attempts, finishSession]);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  /** If index outruns the pool (open-ended / timed), append the next question. */
  useEffect(() => {
    if (view !== "running" || !currentSession?.config) return;
    if (currentQuestion) return;

    const cfg = currentSession.config;
    const finiteQuestions =
      cfg.sessionLengthMode === "questions" && cfg.questionLimit > 0;
    if (
      finiteQuestions &&
      currentQuestionIndex >= cfg.questionLimit
    ) {
      return;
    }

    if (currentQuestionIndex < currentSession.questions.length) return;

    setCurrentSession((prev) =>
      prev ? appendQuestionToSession(prev) : prev,
    );
  }, [
    view,
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    appendQuestionToSession,
  ]);

  const handleDragStart = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      if (!event.over || event.over.id !== "session-folder") return;

      const draggedId = String(event.active.id);
      const topicVariantId = draggedId.replace("topic-", "");
      
      // Check if it's a topic ID (not a variant ID - variants have format "topicId-variantId")
      const topic = getTopic(topicVariantId);
      if (topic && topic.variants && topic.variants.length > 0) {
        // It's a topic - add all variants
        topic.variants.forEach(variant => {
          const variantId = `${topicVariantId}-${variant.id}`;
          addTopic(variantId, topicVariantId, variant.id);
        });
      } else {
        // It's a variant - add it normally
        addTopic(topicVariantId, "", undefined);
      }
    },
    [addTopic],
  );

  return {
    view,
    activeId,
    selectedTopicVariants,
    questionCount,
    setQuestionCount,
    sessionLengthMode,
    setSessionLengthMode,
    timeLimitMinutes,
    setTimeLimitMinutes,
    remainingSeconds,
    isTimedSession,
    isOpenEndedQuestions,
    isUnlimitedSession,
    hasFiniteQuestionCap,
    presets,
    createPreset,
    loadPreset,
    removePreset,
    addTopic,
    addTopicWithAllVariants,
    removeTopicVariant,
    removeAllTopicVariants,
    clearTopics,
    canStart,
    startSession,
    endSession,
    discardSession,
    submitAnswer,
    continueAfterIncorrect,
    exitSession,
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: displayTotalQuestions,
    isComplete,
    progress,
    showFeedback,
    lastAttempt,
    attemptLog,
    correctAttempts,
    totalAttempts,
    mode,
    handleDragStart,
    handleDragEnd,
  };
}

