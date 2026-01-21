"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReviewQuestion } from "@/types/review";

export function useQuestionEditor(question: ReviewQuestion | null) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<ReviewQuestion | null>(question);

  // Update edited question when question changes
  useEffect(() => {
    setEditedQuestion(question);
    setIsEditMode(false);
  }, [question]);

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
    try {
      const response = await fetch(`/api/review/${editedQuestion.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_stem: editedQuestion.question_stem,
          options: editedQuestion.options,
          solution_reasoning: editedQuestion.solution_reasoning,
          solution_key_insight: editedQuestion.solution_key_insight,
          distractor_map: editedQuestion.distractor_map,
        }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('[useQuestionEditor] Failed to parse error response:', e);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const errorMessage = errorData.error || errorData.details || 'Failed to save changes';
        console.error('[useQuestionEditor] API error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          error: errorData,
          fullErrorData: JSON.stringify(errorData, null, 2),
        });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setIsEditMode(false);
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

