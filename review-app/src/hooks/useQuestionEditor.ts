"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReviewQuestion } from "@/types/review";

export function useQuestionEditor(question: ReviewQuestion | null) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<ReviewQuestion | null>(question);

  // Update edited question when question changes
  // Only update if it's a different question (different ID) to prevent overwriting edits
  useEffect(() => {
    if (question) {
      // Only update if it's a different question (different ID)
      // This prevents overwriting edits when the same question is updated after save
      if (!editedQuestion || editedQuestion.id !== question.id) {
        console.log('[useQuestionEditor] Loading new question:', question.id);
        setEditedQuestion(question);
        setIsEditMode(false);
      }
      // If same question ID but different data and not in edit mode, sync the data
      // This handles cases where the question was updated externally (e.g., after save)
      else if (!isEditMode && JSON.stringify(editedQuestion) !== JSON.stringify(question)) {
        console.log('[useQuestionEditor] Syncing question data (same ID, not in edit mode):', question.id);
        setEditedQuestion(question);
      }
    }
  }, [question?.id, isEditMode]); // Depend on ID and edit mode

  const updateField = useCallback((field: keyof ReviewQuestion, value: any) => {
    if (!editedQuestion) return;
    
    setEditedQuestion({
      ...editedQuestion,
      [field]: value,
    });
  }, [editedQuestion]);

  const updateQuestionStem = useCallback((value: string) => {
    updateField('question_stem', value);
  }, [updateField]);

  const updateOption = useCallback((letter: string, value: string) => {
    if (!editedQuestion) return;
    
    setEditedQuestion({
      ...editedQuestion,
      options: {
        ...editedQuestion.options,
        [letter]: value,
      },
    });
  }, [editedQuestion]);

  const updateSolutionReasoning = useCallback((value: string) => {
    updateField('solution_reasoning', value);
  }, [updateField]);

  const updateKeyInsight = useCallback((value: string) => {
    updateField('solution_key_insight', value);
  }, [updateField]);

  const updateDistractor = useCallback((letter: string, value: string) => {
    if (!editedQuestion) return;
    
    setEditedQuestion({
      ...editedQuestion,
      distractor_map: {
        ...(editedQuestion.distractor_map || {}),
        [letter]: value,
      },
    });
  }, [editedQuestion]);

  const saveChanges = useCallback(async (): Promise<ReviewQuestion | null> => {
    if (!editedQuestion) return null;

    setIsSaving(true);
    
    const payload = {
      question_stem: editedQuestion.question_stem,
      options: editedQuestion.options,
      solution_reasoning: editedQuestion.solution_reasoning,
      solution_key_insight: editedQuestion.solution_key_insight,
      distractor_map: editedQuestion.distractor_map,
    };

    try {
      console.log('[useQuestionEditor] Saving changes:', {
        id: editedQuestion.id,
        payloadKeys: Object.keys(payload),
        questionStemPreview: payload.question_stem?.substring(0, 50),
        optionsCount: Object.keys(payload.options || {}).length,
      });

      const response = await fetch(`/api/review/${editedQuestion.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Clone the response before reading it, so we can read it multiple times if needed
        const responseClone = response.clone();
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          // If JSON parsing fails, try reading as text
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
        
        // Log the full error object with all properties
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
          // Try to get all properties of errorData
          allErrorKeys: Object.keys(errorData),
        });
        
        // Include more details in the error message
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
      
      // Handle case where update succeeded but question couldn't be retrieved
      if (data.warning) {
        console.warn('[useQuestionEditor] Update succeeded with warning:', data.warning);
      }
      
      if (!data.question) {
        // If question is null, we need to refetch it
        const errorMsg = data.message || data.error || 'Question updated but could not be retrieved';
        console.error('[useQuestionEditor] No question in response:', {
          data,
          errorMsg,
        });
        throw new Error(errorMsg);
      }
      
      // Verify the saved data matches what we sent
      const savedMatches = 
        data.question.question_stem === payload.question_stem &&
        JSON.stringify(data.question.options) === JSON.stringify(payload.options) &&
        data.question.solution_reasoning === payload.solution_reasoning &&
        data.question.solution_key_insight === payload.solution_key_insight &&
        JSON.stringify(data.question.distractor_map) === JSON.stringify(payload.distractor_map);
      
      if (!savedMatches) {
        console.warn('[useQuestionEditor] Saved data may not match sent data:', {
          sent: {
            questionStem: payload.question_stem?.substring(0, 50),
            optionsKeys: Object.keys(payload.options || {}),
          },
          received: {
            questionStem: data.question.question_stem?.substring(0, 50),
            optionsKeys: Object.keys(data.question.options || {}),
          },
        });
      }
      
      // Update local state with the saved question immediately
      // This ensures the UI reflects the saved changes without needing a refresh
      setEditedQuestion(data.question);
      setIsEditMode(false);
      
      console.log('[useQuestionEditor] Question saved successfully:', {
        id: data.question.id,
        questionStemPreview: data.question.question_stem?.substring(0, 50),
        savedMatches,
      });
      
      return data.question;
    } catch (err: any) {
      console.error('[useQuestionEditor] Error saving:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [editedQuestion]);

  const enterEditMode = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setEditedQuestion(question);
  }, [question]);

  return {
    isEditMode,
    isSaving,
    editedQuestion: editedQuestion || question,
    updateQuestionStem,
    updateOption,
    updateSolutionReasoning,
    updateKeyInsight,
    updateDistractor,
    saveChanges,
    enterEditMode,
    exitEditMode,
  };
}

