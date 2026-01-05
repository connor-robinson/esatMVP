/**
 * Hook for editing question fields with optimistic updates
 */

import { useState, useCallback } from "react";
import type { QuestionBankQuestion } from "@/types/questionBank";

interface UseQuestionEditorReturn {
  isUpdating: boolean;
  error: string | null;
  updateQuestion: (
    questionId: string,
    field: keyof QuestionBankQuestion,
    value: any
  ) => Promise<QuestionBankQuestion>;
  updateQuestionField: (
    questionId: string,
    updates: Partial<QuestionBankQuestion>
  ) => Promise<QuestionBankQuestion>;
}

export function useQuestionEditor(): UseQuestionEditorReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateQuestion = useCallback(
    async (
      questionId: string,
      field: keyof QuestionBankQuestion,
      value: any
    ): Promise<QuestionBankQuestion> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/question-bank/questions/${questionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [field]: value }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update question');
        }

        const data = await response.json();
        return data.question;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
        setError(errorMessage);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  const updateQuestionField = useCallback(
    async (
      questionId: string,
      updates: Partial<QuestionBankQuestion>
    ): Promise<QuestionBankQuestion> => {
      setIsUpdating(true);
      setError(null);

      try {
        const response = await fetch(`/api/question-bank/questions/${questionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update question');
        }

        const data = await response.json();
        return data.question;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
        setError(errorMessage);
        throw err;
      } finally {
        setIsUpdating(false);
      }
    },
    []
  );

  return {
    isUpdating,
    error,
    updateQuestion,
    updateQuestionField,
  };
}











