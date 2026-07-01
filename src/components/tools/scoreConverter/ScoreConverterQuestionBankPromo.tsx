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
  className,
}: {
  open: boolean;
  exam: ConverterExam;
  onDismiss: () => void;
  className?: string;
}) {
  const copy = promoCopy(exam);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          aria-labelledby="score-converter-qb-promo-title"
          className={cn(
            "relative overflow-hidden rounded-organic-xl bg-secondary/35",
            className,
          )}
        >
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 z-10 rounded-organic-md p-1.5 text-text/60 transition-colors hover:bg-background/20 hover:text-text"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className="pointer-events-none absolute -right-4 top-1/2 h-28 w-28 -translate-y-1/2 opacity-[0.12] sm:-right-1 sm:h-32 sm:w-32"
            aria-hidden
          >
            <BrandMarkImage className="h-full w-full object-contain" alt="" />
          </div>

          <div className="relative flex flex-col gap-4 p-5 pr-12 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 sm:pr-14">
            <div className="min-w-0 flex-1">
              <h2
                id="score-converter-qb-promo-title"
                className="text-base font-bold tracking-tight text-text sm:text-lg"
              >
                {copy.headline}
              </h2>
              <p className="mt-1 text-sm text-text/75">{copy.sub}</p>
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
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
