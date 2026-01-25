"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeReviewQuestion } from "@/lib/utils";
import type { ReviewQuestion } from "@/types/review";

export function useQuestionEditor(question: ReviewQuestion | null, onSaveComplete?: (updated: ReviewQuestion) => void) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Normalize question to ensure it has all required fields
  const normalizedQuestion = question ? normalizeReviewQuestion(question) : null;
  const [editedQuestion, setEditedQuestion] = useState<ReviewQuestion | null>(normalizedQuestion);

  // Save function - defined first so other functions can use it
  const saveChanges = useCallback(async (questionToSave?: ReviewQuestion): Promise<ReviewQuestion | null> => {
    const question = questionToSave || editedQuestion;
    if (!question) return null;

    setIsSaving(true);
    
    const payload = {
      question_stem: question.question_stem,
      options: question.options,
      solution_reasoning: question.solution_reasoning,
      solution_key_insight: question.solution_key_insight,
      distractor_map: question.distractor_map,
      difficulty: question.difficulty,
      paper: question.paper,
      primary_tag: question.primary_tag,
      secondary_tags: question.secondary_tags,
    };

    try {
      console.log('[useQuestionEditor] Saving changes:', {
        id: question.id,
        payloadKeys: Object.keys(payload),
        questionStemPreview: payload.question_stem?.substring(0, 50),
        optionsCount: Object.keys(payload.options || {}).length,
      });

      const response = await fetch(`/api/review/${question.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseClone = response.clone();
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          try {
            const text = await responseClone.text();
            console.error('[useQuestionEditor] Failed to parse error response as JSON, raw text:', text);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}`, rawText: text };
          } catch (textError) {
            console.error('[useQuestionEditor] Failed to parse error response:', e, textError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        }
        
        const errorMessage = errorData.error || errorData.details || errorData.message || 'Failed to save changes';
        
        console.error('[useQuestionEditor] API error - Full Details:', {
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
      
      console.log('[useQuestionEditor] API response:', {
        hasQuestion: !!data.question,
        hasWarning: !!data.warning,
        hasError: !!data.error,
        questionId: data.question?.id,
      });
      
      if (data.warning) {
        console.warn('[useQuestionEditor] Update succeeded with warning:', data.warning);
      }
      
      if (!data.question) {
        const errorMsg = data.message || data.error || 'Question updated but could not be retrieved';
        console.error('[useQuestionEditor] No question in response:', {
          data,
          errorMsg,
        });
        throw new Error(errorMsg);
      }
      
      // Normalize the saved question to ensure all fields are present
      const normalizedSavedQuestion = normalizeReviewQuestion(data.question);
      
      // Update local state with the saved question immediately
      setEditedQuestion(normalizedSavedQuestion);
      
      // Notify parent component of save completion
      if (onSaveComplete) {
        onSaveComplete(normalizedSavedQuestion);
      }
      
      console.log('[useQuestionEditor] Question saved successfully:', {
        id: normalizedSavedQuestion.id,
        questionStemPreview: normalizedSavedQuestion.question_stem?.substring(0, 50),
      });
      
      return normalizedSavedQuestion;
    } catch (err: any) {
      console.error('[useQuestionEditor] Error saving:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [editedQuestion, onSaveComplete]);

  // Update edited question when question changes
  useEffect(() => {
    if (normalizedQuestion) {
      if (!editedQuestion || editedQuestion.id !== normalizedQuestion.id) {
        console.log('[useQuestionEditor] Loading new question:', normalizedQuestion.id);
        setEditedQuestion(normalizedQuestion);
        setEditingField(null);
      }
      else if (!editingField && JSON.stringify(editedQuestion) !== JSON.stringify(normalizedQuestion)) {
        console.log('[useQuestionEditor] Syncing question data (same ID, not editing):', normalizedQuestion.id);
        setEditedQuestion(normalizedQuestion);
      }
    } else if (question === null && editedQuestion !== null) {
      setEditedQuestion(null);
      setEditingField(null);
    }
  }, [normalizedQuestion?.id, editingField, question, editedQuestion]);

  const updateField = useCallback((field: keyof ReviewQuestion, value: any, autoSave: boolean = true) => {
    if (!editedQuestion) return;
    
    const updated = {
      ...editedQuestion,
      [field]: value,
    };
    
    setEditedQuestion(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges]);

  const updateQuestionStem = useCallback((value: string, autoSave: boolean = true) => {
    updateField('question_stem', value, autoSave);
  }, [updateField]);

  const updateOption = useCallback((letter: string, value: string, autoSave: boolean = true) => {
    if (!editedQuestion) return;
    
    const currentOptions = editedQuestion.options || {};
    const updated = {
      ...editedQuestion,
      options: {
        ...currentOptions,
        [letter]: value,
      },
    };
    
    setEditedQuestion(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges]);

  const updateSolutionReasoning = useCallback((value: string, autoSave: boolean = true) => {
    updateField('solution_reasoning', value, autoSave);
  }, [updateField]);

  const updateKeyInsight = useCallback((value: string, autoSave: boolean = true) => {
    updateField('solution_key_insight', value, autoSave);
  }, [updateField]);

  const updateDistractor = useCallback((letter: string, value: string, autoSave: boolean = true) => {
    if (!editedQuestion) return;
    
    const updated = {
      ...editedQuestion,
      distractor_map: {
        ...(editedQuestion.distractor_map || {}),
        [letter]: value,
      },
    };
    
    setEditedQuestion(updated);
    
    if (autoSave) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges]);

  const updateDifficulty = useCallback((value: 'Easy' | 'Medium' | 'Hard') => {
    updateField('difficulty', value, true);
  }, [updateField]);

  const updatePaper = useCallback((value: string | null) => {
    updateField('paper', value, true);
  }, [updateField]);

  const updatePrimaryTag = useCallback((value: string | null) => {
    updateField('primary_tag', value, true);
  }, [updateField]);

  const addSecondaryTag = useCallback((tag: string) => {
    if (!editedQuestion) return;
    
    const currentTags = editedQuestion.secondary_tags || [];
    if (!currentTags.includes(tag)) {
      const updated = {
        ...editedQuestion,
        secondary_tags: [...currentTags, tag],
      };
      setEditedQuestion(updated);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveChanges(updated).catch(err => {
        console.error('[useQuestionEditor] Auto-save failed:', err);
      });
    }
  }, [editedQuestion, saveChanges]);

  const removeSecondaryTag = useCallback((tag: string) => {
    if (!editedQuestion) return;
    
    const currentTags = editedQuestion.secondary_tags || [];
    const updated = {
      ...editedQuestion,
      secondary_tags: currentTags.filter(t => t !== tag),
    };
    setEditedQuestion(updated);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveChanges(updated).catch(err => {
      console.error('[useQuestionEditor] Auto-save failed:', err);
    });
  }, [editedQuestion, saveChanges]);

  const startEditingField = useCallback((fieldName: string) => {
    setEditingField(fieldName);
  }, []);

  const stopEditingField = useCallback(() => {
    if (editedQuestion && editingField) {
      saveChanges(editedQuestion).catch(err => {
        console.error('[useQuestionEditor] Auto-save on blur failed:', err);
      });
    }
    setEditingField(null);
  }, [editedQuestion, editingField, saveChanges]);

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
    updateSolutionReasoning,
    updateKeyInsight,
    updateDistractor,
    updateDifficulty,
    updatePaper,
    updatePrimaryTag,
    addSecondaryTag,
    removeSecondaryTag,
    saveChanges,
    startEditingField,
    stopEditingField,
  };
}
