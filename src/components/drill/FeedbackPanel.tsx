/**
 * Feedback panel showing correct/incorrect result
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackPanelProps {
  isCorrect: boolean;
  correctAnswer?: string;
  userAnswer?: string;
  show: boolean;
  onNext?: () => void;
}

export function FeedbackPanel({
  isCorrect,
  correctAnswer,
  userAnswer,
  show,
  onNext,
}: FeedbackPanelProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute inset-0 flex items-center justify-center z-10",
            "bg-background/95 backdrop-blur-md"
          )}
        >
          <div className="text-center space-y-4">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "mx-auto w-20 h-20 rounded-full flex items-center justify-center",
                isCorrect ? "bg-primary/20 border border-primary" : "bg-error/20 border border-error"
              )}
            >
              {isCorrect ? (
                <Check className="h-10 w-10 text-primary" strokeWidth={3} />
              ) : (
                <X className="h-10 w-10 text-error" strokeWidth={3} />
              )}
            </motion.div>
            
            {/* Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <h3
                className={cn(
                  "text-2xl font-heading font-bold",
                  isCorrect ? "text-primary" : "text-error"
                )}
              >
                {isCorrect ? "Correct!" : "Incorrect"}
              </h3>
              
              {!isCorrect && correctAnswer && (
                <div className="text-white/60">
                  <div className="text-sm mb-1">Your answer: {userAnswer || "—"}</div>
                  <div className="text-base">
                    Correct answer: <span className="font-mono font-bold text-white/90">{correctAnswer}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

