"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StemContent } from "@/components/shared/StemContent";
import { QuestionWithGraph } from "@/components/shared/QuestionWithGraph";
import type { TMUAGraphSpec } from "@/components/shared/TMUAGraph";
import { X, Lightbulb, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

function splitSolutionSteps(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function SolutionBody({
  solution_reasoning,
  graphSpecs,
}: {
  solution_reasoning: string;
  graphSpecs?: Record<string, TMUAGraphSpec> | null;
}) {
  const steps = useMemo(
    () => splitSolutionSteps(solution_reasoning),
    [solution_reasoning],
  );
  const useStepLayout = !graphSpecs && steps.length > 1;

  if (graphSpecs) {
    return (
      <QuestionWithGraph
        questionText={solution_reasoning}
        graphSpecs={graphSpecs}
        className="text-[0.9375rem] leading-[1.75] text-text sm:text-base [&_.katex]:text-text"
      />
    );
  }

  if (!useStepLayout) {
    return (
      <StemContent
        content={solution_reasoning}
        className="text-[0.9375rem] leading-[1.75] text-text sm:text-base [&_.katex]:text-text"
      />
    );
  }

  return (
    <ol className="space-y-5 sm:space-y-6">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3.5 sm:gap-4">
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              "bg-surface-mid text-[11px] font-semibold tabular-nums text-text-muted",
            )}
            aria-hidden
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <StemContent
              content={step}
              className="text-[0.9375rem] leading-[1.75] text-text sm:text-base [&_.katex]:text-text"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solution_reasoning: string | null;
  graphSpecs?: Record<string, TMUAGraphSpec> | null;
}

export function SolutionModal({
  isOpen,
  onClose,
  solution_reasoning,
  graphSpecs,
}: SolutionModalProps) {
  const hasContent =
    solution_reasoning != null && String(solution_reasoning).trim() !== "";
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
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detailed-explanation-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-secondary">
                  <ListOrdered className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2
                    id="detailed-explanation-title"
                    className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-text"
                  >
                    <span>Detailed explanation</span>
                    <span className="rounded-organic-sm bg-surface-mid px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
                      Beta
                    </span>
                  </h2>
                  <p className="mt-0.5 text-sm text-text-muted">
                    Step-by-step solution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-organic-md bg-surface-mid text-text-muted hover:bg-surface-neutral hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-subtle/40 px-5 py-5 sm:px-8 sm:py-6">
              <SolutionBody
                solution_reasoning={solution_reasoning!}
                graphSpecs={graphSpecs}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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

            <div className="border-t border-border-subtle/40 px-5 py-5 sm:px-6 sm:py-6">
              <StemContent
                content={content!}
                className="text-[0.9375rem] leading-[1.75] text-text sm:text-base [&_.katex]:text-text"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
