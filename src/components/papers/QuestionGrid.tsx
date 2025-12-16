/**
 * Question grid component for quick navigation
 */

import { cn } from "@/lib/utils";
import type { Answer, Letter } from "@/types/papers";

interface QuestionGridProps {
  questionNumbers: number[];
  currentIndex: number;
  answers: Answer[];
  correctFlags: (boolean | null)[];
  guessedFlags: boolean[];
  onNavigate: (index: number) => void;
  className?: string;
}

export function QuestionGrid({
  questionNumbers,
  currentIndex,
  answers,
  correctFlags,
  guessedFlags,
  onNavigate,
  className
}: QuestionGridProps) {
  const getQuestionState = (index: number) => {
    const answer = answers[index];
    const correct = correctFlags[index];
    const guessed = guessedFlags[index];
    
    if (correct === true) return "correct";
    if (correct === false) return "wrong";
    if (guessed) return "guessed";
    if (answer?.choice) return "answered";
    return "unanswered";
  };

  const getStateStyles = (state: string) => {
    switch (state) {
      case "correct":
        return "bg-success/20 text-success ring-success/40";
      case "wrong":
        return "bg-error/20 text-error ring-error/40";
      case "guessed":
        return "bg-warning/20 text-warning ring-warning/40";
      case "answered":
        return "bg-primary/20 text-primary ring-primary/40";
      case "unanswered":
        return "bg-white/5 text-neutral-300 ring-white/10 hover:bg-white/10";
      default:
        return "bg-white/5 text-neutral-300 ring-white/10";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-sm text-neutral-400">Quick navigation</div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {questionNumbers.map((questionNumber, index) => {
          const state = getQuestionState(index);
          const isCurrent = index === currentIndex;
          
          return (
            <button
              key={questionNumber}
              onClick={() => onNavigate(index)}
              className={cn(
                "rounded-organic-md px-3 py-2 text-sm font-medium ring-1 transition-all duration-fast ease-signature",
                "interaction-scale",
                isCurrent
                  ? "bg-white text-neutral-900 ring-white/40 shadow-glow"
                  : getStateStyles(state)
              )}
              title={`Question ${questionNumber}`}
            >
              {questionNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}


