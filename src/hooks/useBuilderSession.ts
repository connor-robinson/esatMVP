/**
 * Hook for managing builder session state and operations
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { SessionPreset, BuilderSession, GeneratedQuestion, QuestionAttempt } from "@/types/core";
import type { SessionPresetInsert } from "@/lib/supabase/types";
import { generateMixedQuestions } from "@/lib/generators";
import { generateId } from "@/lib/utils";
import { getTopic } from "@/config/topics";

type ViewState = "builder" | "running" | "results";

const mapPresetRow = (row: any): SessionPreset => ({
  id: row.id,
  name: row.name,
  topics: row.topic_labels ?? row.topic_ids ?? [],
  topicIds: row.topic_ids ?? [],
  questionCount: row.question_count ?? 0,
  durationMin: row.duration_min ?? 0,
  topicLevels: (row.topic_levels as Record<string, number>) ?? {},
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
});

export function useBuilderSession() {
  const supabase = useSupabaseClient();
  const authSession = useSupabaseSession();

  // UI state
  const [view, setView] = useState<ViewState>("builder");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Session configuration
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [topicLevels, setTopicLevels] = useState<Record<string, number>>({});

  const [presets, setPresets] = useState<SessionPreset[]>([]);

  // Running session state
  const [currentSession, setCurrentSession] = useState<BuilderSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<QuestionAttempt | null>(null);
  const [attemptLog, setAttemptLog] = useState<QuestionAttempt[]>([]);

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
          console.error("[builder] failed to load presets", error);
          return;
        }
        setPresets((data ?? []).map(mapPresetRow));
      });
  }, [authSession?.user, supabase]);

  const canStart = selectedTopics.length > 0;
  const currentQuestion = currentSession?.questions[currentQuestionIndex] || null;
  const isComplete = !!currentSession?.endedAt;
  const progress = currentSession?.questions.length
    ? currentQuestionIndex / currentSession.questions.length
    : 0;

  const addTopic = useCallback((topicId: string) => {
    setSelectedTopics((prev) => (prev.includes(topicId) ? prev : [...prev, topicId]));
  }, []);

  const removeTopic = useCallback((topicId: string) => {
    setSelectedTopics((prev) => prev.filter((id) => id !== topicId));
    setTopicLevels((prev) => {
      const { [topicId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearTopics = useCallback(() => {
    setSelectedTopics([]);
    setTopicLevels({});
  }, []);

  const setTopicLevel = useCallback((topicId: string, levelValue: number) => {
    setTopicLevels((prev) => ({ ...prev, [topicId]: levelValue }));
  }, []);

  const reorderTopics = useCallback((newOrder: string[]) => {
    setSelectedTopics(newOrder);
  }, []);

  const createPreset = useCallback(
    (name: string) => {
      if (!authSession?.user) return;
      if (!name.trim() || selectedTopics.length === 0) return;

      const presetId = generateId();
      const preset: SessionPreset = {
        id: presetId,
        name: name.trim(),
        topics: selectedTopics.map((id) => getTopic(id)?.name || id),
        topicIds: [...selectedTopics],
        questionCount,
        durationMin: questionCount,
        topicLevels: { ...topicLevels },
        createdAt: Date.now(),
      };

      const presetData: SessionPresetInsert = {
        id: presetId,
        user_id: authSession.user.id,
        name: preset.name,
        topic_ids: preset.topicIds,
        topic_labels: preset.topics,
        question_count: preset.questionCount,
        duration_min: preset.durationMin,
        topic_levels: preset.topicLevels,
      };
      
      (supabase as any)
        .from("session_presets")
        .upsert(presetData)
        .then(({ error }: { error: any }) => {
          if (error) {
            console.error("[builder] failed to save preset", error);
            return;
          }
          setPresets((prev) => [preset, ...prev.filter((p) => p.id !== preset.id)]);
        });
    },
    [authSession?.user, selectedTopics, questionCount, topicLevels, supabase],
  );

  const loadPreset = useCallback((preset: SessionPreset) => {
    setSelectedTopics([...preset.topicIds]);
    setQuestionCount(preset.durationMin);
    setTopicLevels({ ...preset.topicLevels });
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
            console.error("[builder] failed to delete preset", error);
            return;
          }
          setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
        });
    },
    [authSession?.user, supabase],
  );

  const startSession = useCallback(() => {
    if (!authSession?.user) return;
    if (selectedTopics.length === 0) return;

    const questions = generateMixedQuestions(selectedTopics, questionCount, topicLevels);
    const sessionId = generateId();
    const startedAt = Date.now();

    const session: BuilderSession = {
      id: sessionId,
      questions,
      startedAt,
      attempts: 0,
    };

    setCurrentSession(session);
    setCurrentQuestionIndex(0);
    setQuestionStartTime(Date.now());
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
    setView("running");

    (supabase as any)
      .from("builder_sessions")
      .insert({
        id: sessionId,
        user_id: authSession.user.id,
        started_at: new Date(startedAt).toISOString(),
        attempts: 0,
        settings: {
          selectedTopics,
          questionCount,
          topicLevels,
        },
      })
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error("[builder] failed to create session", error);
        }
      });

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

      (supabase as any)
        .from("builder_session_questions")
        .insert(rows)
        .then(({ error }: { error: any }) => {
          if (error) {
            console.error("[builder] failed to insert session questions", error);
          }
        });
    }
  }, [authSession?.user, questionCount, selectedTopics, supabase, topicLevels]);

  const persistAttempt = useCallback(
    (sessionId: string, attempt: QuestionAttempt) => {
      if (!authSession?.user) return;
      (supabase as any).from("builder_attempts").insert({
        session_id: sessionId,
        user_id: authSession.user.id,
        question_id: attempt.questionId,
        user_answer: String(attempt.answer),
        is_correct: attempt.isCorrect,
        time_spent_ms: attempt.timeSpent ?? null,
        attempted_at: new Date(attempt.timestamp).toISOString(),
      });
    },
    [authSession?.user, supabase],
  );

  const finalizeSession = useCallback(
    (sessionId: string, attempts: number) => {
      if (!authSession?.user) return;
      (supabase as any)
        .from("builder_sessions")
        .update({
          ended_at: new Date().toISOString(),
          attempts,
        })
        .eq("id", sessionId)
        .eq("user_id", authSession.user.id)
        .then(({ error }: { error: any }) => {
          if (error) {
            console.error("[builder] failed to finalize session", error);
          }
        });
    },
    [authSession?.user, supabase],
  );

  const submitAnswer = useCallback(
    (userAnswer: string) => {
      if (!currentSession || !currentQuestion) return;

      const timeTakenMs = Date.now() - questionStartTime;
      const isCorrect = userAnswer.trim() === String(currentQuestion.answer).trim();

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
        setTimeout(() => {
          setShowFeedback(false);

          if (currentQuestionIndex < (currentSession?.questions.length ?? 0) - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setQuestionStartTime(Date.now());
            setLastAttempt(null);
          } else {
            const attemptsTotal = (currentSession?.attempts ?? 0) + 1;
            setCurrentSession((prev) =>
              prev
                ? {
                    ...prev,
                    attempts: attemptsTotal,
                    endedAt: Date.now(),
                  }
                : prev,
            );
            setView("results");
            finalizeSession(currentSession.id, attemptsTotal);
          }
        }, 80);
      }
    },
    [currentSession, currentQuestion, currentQuestionIndex, questionStartTime, persistAttempt, finalizeSession],
  );

  const continueAfterIncorrect = useCallback(() => {
    if (!currentSession || view !== "running") return;

    setShowFeedback(false);

    if (currentQuestionIndex < currentSession.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setQuestionStartTime(Date.now());
      setLastAttempt(null);
    } else {
      const attemptsTotal = currentSession.attempts;
      setCurrentSession({ ...currentSession, endedAt: Date.now() });
      setView("results");
      finalizeSession(currentSession.id, attemptsTotal);
    }
  }, [currentSession, currentQuestionIndex, finalizeSession, view]);

  const exitSession = useCallback(() => {
    setView("builder");
    setCurrentSession(null);
    setCurrentQuestionIndex(0);
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
  }, []);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  const handleDragStart = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);

      if (!event.over || event.over.id !== "session-folder") return;

      const topicId = String(event.active.id).replace("topic-", "");
      addTopic(topicId);
    },
    [addTopic],
  );

  return {
    view,
    activeId,
    selectedTopics,
    questionCount,
    setQuestionCount,
    topicLevels,
    setTopicLevel,
    presets,
    createPreset,
    loadPreset,
    removePreset,
    addTopic,
    removeTopic,
    clearTopics,
    reorderTopics,
    canStart,
    startSession,
    submitAnswer,
    continueAfterIncorrect,
    exitSession,
    currentSession,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: currentSession?.questions.length || 0,
    isComplete,
    progress,
    showFeedback,
    lastAttempt,
    attemptLog,
    handleDragStart,
    handleDragEnd,
  };
}

