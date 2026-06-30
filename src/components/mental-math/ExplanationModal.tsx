/**
 * Modal for displaying question explanations without shifting session layout.
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { MathContent } from "@/components/shared/MathContent";

interface ExplanationModalProps {
  show: boolean;
  content: string;
  onClose: () => void;
}

export function ExplanationModal({ show, content, onClose }: ExplanationModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="explanation-modal-title"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative max-h-[min(80vh,32rem)] w-full max-w-lg overflow-y-auto rounded-organic-xl border border-border bg-surface-elevated p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
              aria-label="Close explanation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <h2
              id="explanation-modal-title"
              className="pr-8 font-heading text-lg font-bold text-text"
            >
              Explanation
            </h2>

            <MathContent
              content={content}
              className="mt-4 text-sm leading-relaxed text-text-muted"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
