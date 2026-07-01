"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { cn } from "@/lib/utils";
import type { ConverterExam } from "@/lib/scoreConverter/esatModules";

function promoCopy(exam: ConverterExam) {
  if (exam === "TMUA") {
    return {
      headline: "How can I improve my TMUA score?",
      sub: "Try curated TMUA-style questions in our question bank.",
      cta: "Try question bank",
    };
  }
  return {
    headline: "How can I improve my ESAT score?",
    sub: "Try curated ESAT & admissions questions in our question bank.",
    cta: "Try question bank",
  };
}

export function ScoreConverterQuestionBankPromo({
  open,
  exam,
  onDismiss,
}: {
  open: boolean;
  exam: ConverterExam;
  onDismiss: () => void;
}) {
  const copy = promoCopy(exam);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-6 sm:items-center sm:p-6"
          role="presentation"
          onClick={onDismiss}
        >
          <div className="absolute inset-0 bg-background/55 backdrop-blur-[2px]" aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-converter-qb-promo-title"
            className="relative w-full max-w-3xl overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onDismiss}
              className="absolute right-3 top-3 z-10 rounded-organic-md p-1.5 text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Decorative mark — like the LSAT banner mascot */}
            <div
              className="pointer-events-none absolute -right-6 top-1/2 h-28 w-28 -translate-y-1/2 opacity-[0.07] sm:-right-2 sm:h-36 sm:w-36"
              aria-hidden
            >
              <BrandMarkImage className="h-full w-full object-contain opacity-80" alt="" />
            </div>

            <div className="relative flex flex-col gap-4 p-5 pr-12 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 sm:pr-14">
              <div className="min-w-0 flex-1">
                <h2
                  id="score-converter-qb-promo-title"
                  className="text-base font-bold tracking-tight text-text sm:text-lg"
                >
                  {copy.headline}
                </h2>
                <p className="mt-1 text-sm text-text-muted">{copy.sub}</p>
              </div>

              <Link
                href="/questions/questionbank"
                onClick={onDismiss}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-fast",
                  "bg-background text-text hover:brightness-95 active:scale-[0.98]",
                )}
              >
                <span>{copy.cta}</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
