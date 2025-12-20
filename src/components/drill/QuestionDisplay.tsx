/**
 * Question display component with animation
 */

"use client";

import { motion } from "framer-motion";
import { GeneratedQuestion } from "@/types/core";
import { cn } from "@/lib/utils";
import { MathContent } from "@/components/shared/MathContent";

interface QuestionDisplayProps {
  question: GeneratedQuestion;
  questionNumber: number;
  totalQuestions: number;
  className?: string;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  className,
}: QuestionDisplayProps) {
  return (
    <motion.div
      key={questionNumber}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn("text-center", className)}
    >
      {/* Question counter */}
      <div className="mb-4 text-sm text-white/50">
        Question {questionNumber} of {totalQuestions}
      </div>
      
      {/* Question text */}
      <div className="text-5xl md:text-6xl font-mono font-bold text-white/90 tracking-tight">
        <MathContent content={question.question} />
      </div>
      
      {/* Hint for difficulty */}
      {(question as any).metadata?.trick && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-sm text-primary"
        >
          💡 There&apos;s a shortcut for this one!
        </motion.div>
      )}
    </motion.div>
  );
}

