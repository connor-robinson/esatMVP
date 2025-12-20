/**
 * Hook for managing builder session state and operations
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import type { SessionPreset, BuilderSession, GeneratedQuestion, QuestionAttempt, TopicVariantSelection } from "@/types/core";
import type { SessionPresetInsert } from "@/lib/supabase/types";
import { generateMixedQuestions } from "@/lib/generators";
import { generateId } from "@/lib/utils";
import { getTopic } from "@/config/topics";

type ViewState = "builder" | "running" | "results";

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

  // Session configuration
  const [selectedTopicVariants, setSelectedTopicVariants] = useState<TopicVariantSelection[]>([]);
  const [questionCount, setQuestionCount] = useState(20);

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

  const canStart = selectedTopicVariants.length > 0;
  const currentQuestion = currentSession?.questions[currentQuestionIndex] || null;
  const isComplete = !!currentSession?.endedAt;
  const progress = currentSession?.questions.length
    ? currentQuestionIndex / currentSession.questions.length
    : 0;
  
  // Calculate correct count from attempt log
  const correctCount = attemptLog.filter(attempt => attempt.isCorrect).length;

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

  const removeTopicVariant = useCallback((topicVariantId: string) => {
    const parsed = parseTopicVariantId(topicVariantId);
    if (!parsed) return;
    
    setSelectedTopicVariants((prev) => 
      prev.filter(
        tv => !(tv.topicId === parsed.topicId && tv.variantId === parsed.variantId)
      )
    );
  }, [parseTopicVariantId]);

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
            console.error("[builder] failed to save preset", error);
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
            console.error("[builder] failed to delete preset", error);
            return;
          }
          setPresets((prev) => prev.filter((preset) => preset.id !== presetId));
        });
    },
    [authSession?.user, supabase],
  );

  const startSession = useCallback(() => {
    console.log("[startSession] Called", { 
      hasUser: !!authSession?.user, 
      topicVariants: selectedTopicVariants.length,
      questionCount 
    });
    
    if (selectedTopicVariants.length === 0) {
      console.warn("[startSession] No topics selected, cannot start");
      alert("Please add at least one topic to start a session.");
      return;
    }
    
    // Note: Allow starting session without auth for testing
    // if (!authSession?.user) {
    //   console.warn("[startSession] No user session, cannot start");
    //   alert("Please log in to start a session.");
    //   return;
    // }

    // Determine mode based on topics (use mental-math for arithmetic topics)
    const isMentalMath = selectedTopicVariants.every(({ topicId }) => {
      const topic = getTopic(topicId);
      return topic?.category === "arithmetic";
    });
    setMode(isMentalMath ? "mental-math" : "standard");
    console.log("[startSession] Mode set to:", isMentalMath ? "mental-math" : "standard");

    // Convert variant selections to topic IDs and difficulty levels for generator
    const topicIds = selectedTopicVariants.map(tv => tv.topicId);
    const variantToLevelMap: Record<string, number> = {};
    
    selectedTopicVariants.forEach(({ topicId, variantId }) => {
      const topic = getTopic(topicId);
      if (topic && topic.variants) {
        const variant = topic.variants.find(v => v.id === variantId);
        if (variant && variant.config && typeof variant.config.level === 'number') {
          variantToLevelMap[topicId] = variant.config.level;
        } else if (variant && typeof variant.difficulty === 'number') {
          variantToLevelMap[topicId] = variant.difficulty;
        } else {
          variantToLevelMap[topicId] = 1;
        }
      } else {
        variantToLevelMap[topicId] = 1;
      }
    });
    
    const questions = generateMixedQuestions(topicIds, questionCount, variantToLevelMap);
    console.log("[startSession] Generated questions:", questions.length);
    
    if (questions.length === 0) {
      console.error("[startSession] No questions generated!");
      alert("Failed to generate questions. Please try again.");
      return;
    }
    
    const sessionId = generateId();
    const startedAt = Date.now();

    const session: BuilderSession = {
      id: sessionId,
      questions,
      startedAt,
      attempts: 0,
    };

    console.log("[startSession] Setting session, view to running");
    setCurrentSession(session);
    setCurrentQuestionIndex(0);
    setQuestionStartTime(Date.now());
    setShowFeedback(false);
    setLastAttempt(null);
    setAttemptLog([]);
    setView("running");

    // Only save to database if user is logged in
    if (authSession?.user) {
      (supabase as any)
        .from("builder_sessions")
        .insert({
          id: sessionId,
          user_id: authSession.user.id,
          started_at: new Date(startedAt).toISOString(),
          attempts: 0,
          settings: {
            selectedTopicVariants,
            questionCount,
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
    }
  }, [authSession?.user, questionCount, selectedTopicVariants, supabase]);

  const persistAttempt = useCallback(
    (sessionId: string, attempt: QuestionAttempt) => {
      if (!authSession?.user) {
        console.log("[persistAttempt] Skipping - no user session");
        return;
      }
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
      if (!authSession?.user) {
        console.log("[finalizeSession] Skipping - no user session");
        return;
      }
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
      
      // Use custom checker if provided, otherwise do simple string comparison
      let isCorrect: boolean;
      if (currentQuestion.checker) {
        isCorrect = currentQuestion.checker(userAnswer.trim());
      } else {
        isCorrect = userAnswer.trim() === String(currentQuestion.answer).trim();
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
    presets,
    createPreset,
    loadPreset,
    removePreset,
    addTopic,
    removeTopicVariant,
    clearTopics,
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
    correctCount,
    mode,
    handleDragStart,
    handleDragEnd,
  };
}

