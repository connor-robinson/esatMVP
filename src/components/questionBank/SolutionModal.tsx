"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StemContent } from "@/components/shared/StemContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { TMUAGraphSpec } from "@/components/shared/TMUAGraph";
import { X, Pencil, Lightbulb } from "lucide-react";

const bodyPanelClass =
  "rounded-organic-lg bg-surface-mid px-4 py-4 text-sm leading-relaxed text-text sm:text-base [&_.katex]:text-text";

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution_reasoning: string | null;
  onEditReasoning?: () => void;
  graphSpecs?: Record<string, TMUAGraphSpec> | null;
}

export function SolutionModal({
  isOpen,
  onClose,
  solution_reasoning,
  onEditReasoning,
  graphSpecs,
}: SolutionModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detailed-explanation-title"
      >
        <div className="flex items-center justify-between px-5 py-4 sm:px-6">
          <h2
            id="detailed-explanation-title"
            className="text-lg font-semibold tracking-tight text-text"
          >
            Detailed Explanation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors duration-fast ease-signature hover:bg-surface-neutral hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {solution_reasoning && (
            <div className="group space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-text-subtle">
                  Step-by-step solution
                </span>
                {onEditReasoning && (
                  <button
                    type="button"
                    onClick={onEditReasoning}
                    className="flex h-8 w-8 items-center justify-center rounded-organic-sm border border-border-subtle bg-surface-elevated text-text-muted opacity-0 transition-all duration-fast ease-signature group-hover:opacity-100 hover:bg-surface-mid hover:text-text"
                    title="Edit solution"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className={bodyPanelClass}>
                {graphSpecs ? (
                  <QuestionWithGraph
                    questionText={solution_reasoning}
                    graphSpecs={graphSpecs}
                    className="text-inherit"
                  />
                ) : (
                  <StemContent
                    content={solution_reasoning}
                    className="text-inherit"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HintModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string | null | undefined;
}

export function HintModal({ isOpen, onClose, content }: HintModalProps) {
  const hasContent = content != null && String(content).trim() !== "";
  const visible = isOpen && hasContent;

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-primary">
                  <Lightbulb className="h-5 w-5" aria-hidden />
                </div>
                <h2
                  id="hint-modal-title"
                  className="truncate text-lg font-semibold tracking-tight text-text"
                >
                  Hint
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted transition-colors duration-fast ease-signature hover:bg-surface-neutral hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className={bodyPanelClass}>
                <StemContent content={content!} className="text-inherit" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
