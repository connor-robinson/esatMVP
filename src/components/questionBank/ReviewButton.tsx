"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewButtonProps {
  questionId: string;
  onReviewed: () => void;
}

export function ReviewButton({ questionId, onReviewed }: ReviewButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarkAsReviewed = async () => {
    console.log('[ReviewButton] Starting review for question ID:', questionId);
    console.log('[ReviewButton] Question ID type:', typeof questionId);
    console.log('[ReviewButton] Question ID length:', questionId?.length);
    
    setIsSubmitting(true);
    setError(null);

    // Optimistically move to next question immediately
    onReviewed();

    // Update in background
    try {
      const url = `/api/question-bank/questions/${questionId}`;
      console.log('[ReviewButton] Fetching URL:', url);
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });
      
      console.log('[ReviewButton] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ReviewButton] Failed to update:', errorData);
        console.error('[ReviewButton] Response status:', response.status);
        console.error('[ReviewButton] Response headers:', response.headers);
        throw new Error(errorData.error || 'Failed to mark as reviewed');
      }

      const successData = await response.json();
      console.log('[ReviewButton] Successfully approved question:', questionId);
      console.log('[ReviewButton] Response data:', successData);
    } catch (err) {
      console.error('[ReviewButton] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as reviewed');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleMarkAsReviewed}
        disabled={isSubmitting}
        className={cn(
          "fixed bottom-8 right-8 px-6 py-3 rounded-full font-semibold text-sm shadow-xl transition-all z-50 flex items-center gap-2",
          isSubmitting
            ? "bg-green-500/50 text-white/50 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600 hover:scale-105 active:scale-95"
        )}
      >
        <Check className="w-5 h-5" />
        {isSubmitting ? 'Approving...' : 'Approve Question'}
      </button>

      {error && (
        <div className="fixed bottom-24 right-8 px-4 py-2 bg-error/90 text-white text-sm rounded-lg shadow-xl z-50">
          {error}
        </div>
      )}
    </>
  );
}

