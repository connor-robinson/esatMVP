"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeReviewQuestion, reviewQuestionsGetUrl } from "@/lib/utils";
import type { ReviewQuestion } from "@/types/review";

export function useQuestionEditor(question: ReviewQuestion | null, onSaveComplete?: (updated: ReviewQuestion) => void) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Latest draft; updated synchronously on each keystroke so blur saves match the textarea value. */
  const editedQuestionRef = useRef<ReviewQuestion | null>(null);
  /**
   * Serializes PATCH requests. Concurrent saves (e.g. blur on solution textarea then radio for
   * correct answer) used to send two full-row payloads; whichever finished last overwrote the
   * other in the DB — PATCH looked OK, immediate GET / reload showed the loser.
   */
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  /** Monotonic id so server + client logs can correlate queued save jobs. */
  const saveOpSeqRef = useRef(0);
  /** After a successful PATCH, ignore parent props until their `updated_at` catches up (avoids stale React props vs fresh save). */
  const lastPersistedUpdatedAtRef = useRef<string>("");

  // Normalize question to ensure it has all required fields
  const normalizedQuestion = question ? normalizeReviewQuestion(question) : null;
  const [editedQuestion, setEditedQuestion] = useState<ReviewQuestion | null>(normalizedQuestion);

  const commitLocal = useCallback((q: ReviewQuestion | null) => {
    editedQuestionRef.current = q;
    setEditedQuestion(q);
  }, []);

  const patchPartial = useCallback(
    async (payload: Record<string, unknown>, reason: string): Promise<ReviewQuestion> => {
      const prev = saveChainRef.current;
      const mine = prev.catch(() => {}).then(async (): Promise<ReviewQuestion> => {
        const q = editedQuestionRef.current;
        if (!q?.id) throw new Error("No question loaded");
        const response = await fetch(`/api/review/${q.id}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok || !data?.question) {
          throw new Error(data?.error || data?.details || `Failed partial save (${reason})`);
        }
        const normalizedSavedQuestion = normalizeReviewQuestion(data.question);
        lastPersistedUpdatedAtRef.current = normalizedSavedQuestion.updated_at || "";
        commitLocal(normalizedSavedQuestion);
        onSaveComplete?.(normalizedSavedQuestion);
        console.log("[review-persist] partial PATCH applied", {
          reason,
          id: normalizedSavedQuestion.id,
          updated_at: normalizedSavedQuestion.updated_at,
          correct_option: normalizedSavedQuestion.correct_option,
          has_backup: !!normalizedSavedQuestion.question_stem_before_auto_diagram,
        });
        return normalizedSavedQuestion;
      });
      saveChainRef.current = mine.catch(() => null);
      return mine;
    },
    [commitLocal, onSaveComplete]
  );

  // Save function - defined first so other functions can use it
  const saveChanges = useCallback(async (_questionToSave?: ReviewQuestion): Promise<ReviewQuestion | null> => {
    const prev = saveChainRef.current;
    const mine = prev.catch(() => {}).then(async (): Promise<ReviewQuestion | null> => {
      // Always read immediately before network: callers may pass stale snapshots; blur + radio
      // can enqueue two saves — the second must see the ref updated by commitLocal in between.
      const saveOp = ++saveOpSeqRef.current;
      const question = editedQuestionRef.current;
      if (!question) {
        console.warn("[review-persist] save skipped — editedQuestionRef is null", { saveOp });
        return null;
      }

      setIsSaving(true);

      const payload = {
        question_stem: question.question_stem,
        question_stem_before_auto_diagram:
          question.question_stem_before_auto_diagram ?? null,
        options: question.options,
        correct_option: question.correct_option,
        solution_reasoning: question.solution_reasoning,
        solution_key_insight: question.solution_key_insight,
        distractor_map: question.distractor_map,
        difficulty: question.difficulty,
        subjects: question.subjects,
        primary_tag: question.primary_tag,
        secondary_tags: question.secondary_tags,
      };

      try {
        console.log("[review-persist] PATCH about to send", {
          saveOp,
          id: question.id,
          correct_option: payload.correct_option,
          updated_at_local: question.updated_at,
          payloadKeys: Object.keys(payload),
          questionStemPreview: payload.question_stem?.substring(0, 50),
          optionsCount: Object.keys(payload.options || {}).length,
        });

        const response = await fetch(`/api/review/${question.id}/update`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!response.ok) {
          const responseClone = response.clone();
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (e) {
            try {
              const text = await responseClone.text();
              console.error(
                "[useQuestionEditor] Failed to parse error response as JSON, raw text:",
                text
              );
              errorData = {
                error: `HTTP ${response.status}: ${response.statusText}`,
                rawText: text,
              };
            } catch (textError) {
              console.error("[useQuestionEditor] Failed to parse error response:", e, textError);
              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
          }

          const errorMessage =
            errorData.error || errorData.details || errorData.message || "Failed to save changes";

          console.error("[useQuestionEditor] API error - Full Details:", {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData: errorData,
            errorCode: errorData.code,
            errorHint: errorData.hint,
            errorDetails: errorData.details,
            errorMessage: errorData.message,
            authInfo: errorData.authInfo,
            errorType: errorData.type,
            fullErrorData: JSON.stringify(errorData, null, 2),
            allErrorKeys: Object.keys(errorData),
          });

          const detailedError = errorData.details
            ? `${errorMessage}: ${errorData.details}`
            : errorData.code
              ? `${errorMessage} (${errorData.code})`
              : errorMessage;
          throw new Error(detailedError);
        }

        const data = await response.json();

        console.log("[review-persist] PATCH response", {
          saveOp,
          ok: response.ok,
          hasQuestion: !!data.question,
          questionId: data.question?.id,
          correct_option: data.question?.correct_option,
          updated_at: data.question?.updated_at,
        });

        if (data.warning) {
          console.warn("[useQuestionEditor] Update succeeded with warning:", data.warning);
        }

        if (!data.question) {
          const errorMsg =
            data.message || data.error || "Question updated but could not be retrieved";
          console.error("[useQuestionEditor] No question in response:", {
            data,
            errorMsg,
          });
          throw new Error(errorMsg);
        }

        const normalizedSavedQuestion = normalizeReviewQuestion(data.question);
        lastPersistedUpdatedAtRef.current = normalizedSavedQuestion.updated_at || "";

        commitLocal(normalizedSavedQuestion);

        if (onSaveComplete) {
          onSaveComplete(normalizedSavedQuestion);
        }

        console.log("[review-persist] commitLocal + onSaveComplete from PATCH body", {
          saveOp,
          id: normalizedSavedQuestion.id,
          correct_option: normalizedSavedQuestion.correct_option,
          updated_at: normalizedSavedQuestion.updated_at,
        });

        try {
          const verifyUrl = reviewQuestionsGetUrl({
            id: normalizedSavedQuestion.id,
            limit: "1",
          });
          const verifyRes = await fetch(verifyUrl, {
            cache: "no-store",
            credentials: "same-origin",
          });
          const verifyJson = (await verifyRes.json()) as { questions?: ReviewQuestion[] };
          const row = verifyJson.questions?.[0];
          const fullSaved = normalizedSavedQuestion.question_stem || "";
          const fullGet = row?.question_stem || "";
          const stemEqualFull = fullSaved === fullGet;
          const stemHeadSaved = fullSaved.slice(0, 120);
          const stemHeadFetched = fullGet.slice(0, 120);
          const stemEqualHeadOnly = stemHeadSaved === stemHeadFetched;
          const updatedAtMatch =
            (normalizedSavedQuestion.updated_at || "").trim() === (row?.updated_at || "").trim();
          const correctMatch =
            (row?.correct_option || "").toUpperCase().slice(0, 1) ===
            (normalizedSavedQuestion.correct_option || "").toUpperCase().slice(0, 1);
          /** Full stem + timestamps must agree; first-120-only match is insufficient when SVG/HTML is appended after the prose. */
          const match = stemEqualFull && correctMatch && updatedAtMatch;
          console.log("[review-persist] VERIFY_AFTER_SAVE (GET vs PATCH body)", {
            saveOp,
            ok: verifyRes.ok,
            match,
            correct_patch: normalizedSavedQuestion.correct_option,
            correct_get: row?.correct_option,
            stemEqualFull,
            stemEqualHeadOnly,
            updatedAtMatch,
            updated_at_patch: normalizedSavedQuestion.updated_at,
            updated_at_get: row?.updated_at,
            stemLen_patch: fullSaved.length,
            stemLen_get: fullGet.length,
            stemHasSvg_patch: fullSaved.includes("<svg"),
            stemHasSvg_get: fullGet.includes("<svg"),
          });
          if (!match) {
            console.error(
              "[review-persist] VERIFY_AFTER_SAVE mismatch — DB GET disagrees with PATCH response. Check: (1) another tab/process writing this id, (2) edge/CDN caching GET despite no-store, (3) Supabase replica lag, (4) review app env points at a different project than PATCH used."
            );
          }
        } catch (e) {
          console.warn("[review-persist] VERIFY_AFTER_SAVE fetch failed:", e);
        }

        return normalizedSavedQuestion;
      } catch (err: any) {
        console.error("[useQuestionEditor] Error saving:", err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    });

    saveChainRef.current = mine.catch(() => null);
    return mine;
  }, [commitLocal, onSaveComplete]);

  // Reset local state when navigating to another question, or when the server row is newer
  // (e.g. walkthrough upload, refresh) — but never clobber local edits by diffing JSON while
  // editingField is null (difficulty/tags use QuestionPanel-local "pill" state, so editingField
  // stays null and the old JSON sync wiped in-flight edits and confused saves).
  useEffect(() => {
    if (normalizedQuestion) {
      if (!editedQuestion || editedQuestion.id !== normalizedQuestion.id) {
        console.log("[review-persist] editor reset — new question id from props", {
          id: normalizedQuestion.id,
          correct_option: normalizedQuestion.correct_option,
        });
        lastPersistedUpdatedAtRef.current = "";
        commitLocal(normalizedQuestion);
        setEditingField(null);
        return;
      }

      // Never downgrade ref from a React state snapshot that is behind the ref (e.g. save wrote
      // newer `updated_at` to ref before state/render caught up).
      if (editedQuestion?.id) {
        const r = editedQuestionRef.current;
        const stateTs = editedQuestion.updated_at || "";
        const refTs = r?.id === editedQuestion.id ? r.updated_at || "" : "";
        if (!r || r.id !== editedQuestion.id) {
          editedQuestionRef.current = editedQuestion;
        } else if (stateTs >= refTs) {
          editedQuestionRef.current = editedQuestion;
        }
      }

      const serverTs = normalizedQuestion.updated_at || "";
      const localTs = editedQuestion.updated_at || "";
      const serverNewer =
        serverTs.length > 0 && localTs.length > 0 && serverTs > localTs;

      /** Walkthrough upload updates path/code; some DBs do not bump `updated_at` on that PATCH. */
      const serverMediaChanged =
        (normalizedQuestion.screen_video_storage_path || "").trim() !==
          (editedQuestion.screen_video_storage_path || "").trim() ||
        (normalizedQuestion.media_upload_code || "").trim() !==
          (editedQuestion.media_upload_code || "").trim();

      const parentLooksStaleAfterSave =
        !!lastPersistedUpdatedAtRef.current &&
        !!serverTs &&
        serverTs < lastPersistedUpdatedAtRef.current;

      if (
        (serverNewer || serverMediaChanged) &&
        !editingField &&
        !isSaving &&
        !parentLooksStaleAfterSave
      ) {
        console.log("[review-persist] applying parent (server) question to editor", {
          id: normalizedQuestion.id,
          reason: serverNewer ? "newer updated_at" : "media fields changed",
          serverTs,
          localTs,
          serverCorrect: normalizedQuestion.correct_option,
          localCorrect: editedQuestion.correct_option,
        });
        commitLocal(normalizedQuestion);
      } else if ((serverNewer || serverMediaChanged) && parentLooksStaleAfterSave) {
        console.log("[review-persist] skip apply parent — parentLooksStaleAfterSave", {
          id: normalizedQuestion.id,
          serverTs,
          lastPersisted: lastPersistedUpdatedAtRef.current,
        });
      }
    } else if (question === null && editedQuestion !== null) {
      lastPersistedUpdatedAtRef.current = "";
      commitLocal(null);
      setEditingField(null);
    }
  }, [normalizedQuestion, editingField, question, editedQuestion, isSaving, commitLocal]);

  const updateField = useCallback((field: keyof ReviewQuestion, value: any, autoSave: boolean = false) => {
    if (!editedQuestion) return;
    
    const updated = {
      ...editedQuestion,
      [field]: value,
    };
    
    commitLocal(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges, commitLocal]);

  const updateQuestionStem = useCallback((value: string, autoSave: boolean = false) => {
    updateField('question_stem', value, autoSave);
  }, [updateField]);

  const updateOption = useCallback((letter: string, value: string, autoSave: boolean = false) => {
    if (!editedQuestion) return;
    
    const currentOptions = editedQuestion.options || {};
    
    // If value is blank/empty, remove the option (unless it's the correct option)
    if (!value || value.trim() === '') {
      // Don't allow removing the correct option
      if (letter === editedQuestion.correct_option) {
        console.warn('[useQuestionEditor] Cannot remove the correct option');
        return;
      }
      
      // Remove the option
      const { [letter]: removed, ...remainingOptions } = currentOptions;
      const currentDistractorMap = editedQuestion.distractor_map || {};
      const { [letter]: removedDistractor, ...remainingDistractors } = currentDistractorMap;
      
      const updated = {
        ...editedQuestion,
        options: remainingOptions,
        distractor_map: Object.keys(remainingDistractors).length > 0 ? remainingDistractors : null,
      };
      
      commitLocal(updated);
      
      if (autoSave) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveChanges(updated).catch(err => {
          console.error('[useQuestionEditor] Auto-save failed:', err);
        });
      }
      return;
    }
    
    // Otherwise, update the option normally
    const updated = {
      ...editedQuestion,
      options: {
        ...currentOptions,
        [letter]: value,
      },
    };
    
    commitLocal(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges, commitLocal]);

  const updateSolutionReasoning = useCallback((value: string, autoSave: boolean = false) => {
    updateField('solution_reasoning', value, autoSave);
  }, [updateField]);

  const updateKeyInsight = useCallback((value: string, autoSave: boolean = false) => {
    updateField('solution_key_insight', value, autoSave);
  }, [updateField]);

  const addOption = useCallback((autoSave: boolean = true) => {
    if (!editedQuestion) return null;
    
    const currentOptions = editedQuestion.options || {};
    const existingLetters = Object.keys(currentOptions).sort();
    
    // Find next available letter (A-Z)
    let nextLetter = 'A';
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i); // A=65, B=66, etc.
      if (!existingLetters.includes(letter)) {
        nextLetter = letter;
        break;
      }
    }
    
    const updated = {
      ...editedQuestion,
      options: {
        ...currentOptions,
        [nextLetter]: '', // Empty option text
      },
    };
    
    commitLocal(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
    
    return nextLetter;
  }, [editedQuestion, saveChanges, commitLocal]);

  const removeOption = useCallback((letter: string, autoSave: boolean = true) => {
    if (!editedQuestion) return;
    
    const currentOptions = editedQuestion.options || {};
    const currentDistractorMap = editedQuestion.distractor_map || {};
    
    // Don't allow removing the correct option
    if (letter === editedQuestion.correct_option) {
      console.warn('[useQuestionEditor] Cannot remove the correct option');
      return;
    }
    
    const { [letter]: removed, ...remainingOptions } = currentOptions;
    const { [letter]: removedDistractor, ...remainingDistractors } = currentDistractorMap;
    
    const updated = {
      ...editedQuestion,
      options: remainingOptions,
      distractor_map: Object.keys(remainingDistractors).length > 0 ? remainingDistractors : null,
    };
    
    commitLocal(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges, commitLocal]);

  const updateDistractor = useCallback((letter: string, value: string, autoSave: boolean = false) => {
    if (!editedQuestion) return;
    
    const updated = {
      ...editedQuestion,
      distractor_map: {
        ...(editedQuestion.distractor_map || {}),
        [letter]: value,
      },
    };
    
    commitLocal(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges, commitLocal]);

  const updateDifficulty = useCallback((value: 'Easy' | 'Medium' | 'Hard' | 'Extreme') => {
    updateField('difficulty', value, true);
  }, [updateField]);

  const updatePaper = useCallback((value: string | null) => {
    updateField('subjects', value, true);
  }, [updateField]);

  const updatePrimaryTag = useCallback((value: string | null) => {
    updateField('primary_tag', value, true);
  }, [updateField]);

  const updateCorrectOption = useCallback(
    (letter: string) => {
      if (!editedQuestion) return;
      const L = letter.trim().toUpperCase();
      if (!L || !(editedQuestion.options && L in editedQuestion.options)) return;
      const updated = { ...editedQuestion, correct_option: L };
      console.log("[review-persist] updateCorrectOption", {
        id: editedQuestion.id,
        from: editedQuestion.correct_option,
        to: L,
        refAfterCommitWillMatch: true,
      });
      commitLocal(updated);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      patchPartial({ correct_option: L }, "correct_option").catch((err) => {
        console.error("[useQuestionEditor] Save correct option failed:", err);
      });
    },
    [editedQuestion, commitLocal, patchPartial]
  );

  const reorderOption = useCallback(
    (letter: string, direction: "up" | "down") => {
      if (!editedQuestion?.options) return;
      const letters = Object.keys(editedQuestion.options).sort();
      const idx = letters.indexOf(letter);
      if (idx < 0) return;
      const j = direction === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= letters.length) return;
      const other = letters[j];

      const opts = { ...editedQuestion.options };
      const tA = opts[letter];
      const tB = opts[other];
      opts[letter] = tB;
      opts[other] = tA;

      const prevDm = editedQuestion.distractor_map || {};
      const hadL = Object.prototype.hasOwnProperty.call(prevDm, letter);
      const hadO = Object.prototype.hasOwnProperty.call(prevDm, other);
      const vL = hadL ? prevDm[letter] : undefined;
      const vO = hadO ? prevDm[other] : undefined;
      const newDm: Record<string, string> = { ...prevDm };
      if (hadO) newDm[letter] = vO as string;
      else delete newDm[letter];
      if (hadL) newDm[other] = vL as string;
      else delete newDm[other];

      let correct = editedQuestion.correct_option;
      if (correct === letter) correct = other;
      else if (correct === other) correct = letter;

      const nextDm = Object.keys(newDm).length > 0 ? newDm : null;
      const updated = {
        ...editedQuestion,
        options: opts,
        distractor_map: nextDm,
        correct_option: correct,
      };
      commitLocal(updated);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveChanges(updated).catch((err) => {
        console.error("[useQuestionEditor] Reorder save failed:", err);
      });
    },
    [editedQuestion, saveChanges, commitLocal]
  );

  const addSecondaryTag = useCallback((tag: string) => {
    if (!editedQuestion) return;
    
    const currentTags = editedQuestion.secondary_tags || [];
    if (!currentTags.includes(tag)) {
      const updated = {
        ...editedQuestion,
        secondary_tags: [...currentTags, tag],
      };
      commitLocal(updated);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges, commitLocal]);

  const removeSecondaryTag = useCallback((tag: string) => {
    if (!editedQuestion) return;
    
    const currentTags = editedQuestion.secondary_tags || [];
    const updated = {
      ...editedQuestion,
      secondary_tags: currentTags.filter(t => t !== tag),
    };
    commitLocal(updated);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveChanges(updated).catch(err => {
      console.error('[useQuestionEditor] Auto-save failed:', err);
    });
  }, [editedQuestion, saveChanges, commitLocal]);

  const startEditingField = useCallback((fieldName: string) => {
    setEditingField(fieldName);
  }, []);

  const stopEditingField = useCallback(() => {
    if (editingField && editedQuestionRef.current) {
      saveChanges(editedQuestionRef.current).catch(err => {
        console.error('[useQuestionEditor] Auto-save on blur failed:', err);
      });
    }
    setEditingField(null);
  }, [editingField, saveChanges]);

  /** After quality-gate auto-SVG: keep current stem (with diagram) or revert to saved pre-diagram stem. */
  const resolveAutoDiagramStemChoice = useCallback(
    async (choice: "keep_diagram" | "revert"): Promise<void> => {
      const q0 = editedQuestionRef.current;
      const rawBackup = q0?.question_stem_before_auto_diagram;
      if (!q0 || rawBackup == null || !String(rawBackup).trim()) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      const prev = saveChainRef.current;
      const mine = prev.catch(() => {}).then(async (): Promise<void> => {
        const q = editedQuestionRef.current;
        if (!q?.id) throw new Error("No question loaded");
        const optimistic: ReviewQuestion =
          choice === "keep_diagram"
            ? { ...q, question_stem_before_auto_diagram: null }
            : {
                ...q,
                question_stem: String(rawBackup),
                question_stem_before_auto_diagram: null,
              };
        commitLocal(optimistic);

        const response = await fetch(`/api/review/${q.id}/resolve-auto-diagram`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ choice }),
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok || !data?.question) {
          throw new Error(data?.error || data?.details || "Failed to resolve auto diagram choice");
        }
        const normalizedSavedQuestion = normalizeReviewQuestion(data.question);
        lastPersistedUpdatedAtRef.current = normalizedSavedQuestion.updated_at || "";
        commitLocal(normalizedSavedQuestion);
        onSaveComplete?.(normalizedSavedQuestion);
        console.log("[review-persist] resolveAutoDiagramStemChoice applied", {
          id: normalizedSavedQuestion.id,
          choice,
          has_backup: !!normalizedSavedQuestion.question_stem_before_auto_diagram,
          updated_at: normalizedSavedQuestion.updated_at,
        });
      });

      saveChainRef.current = mine.catch(() => null);
      await mine;
    },
    [commitLocal, onSaveComplete]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const safeEditedQuestion = editedQuestion || normalizedQuestion;
  
  return {
    editingField,
    isSaving,
    editedQuestion: safeEditedQuestion,
    updateQuestionStem,
    updateOption,
    addOption,
    removeOption,
    updateSolutionReasoning,
    updateKeyInsight,
    updateDistractor,
    updateDifficulty,
    updatePaper,
    updatePrimaryTag,
    updateCorrectOption,
    reorderOption,
    addSecondaryTag,
    removeSecondaryTag,
    saveChanges,
    resolveAutoDiagramStemChoice,
    startEditingField,
    stopEditingField,
  };
}
