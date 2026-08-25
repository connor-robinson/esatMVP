"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { cn } from "@/lib/utils";
import type { ConverterExam, ConvertedSection } from "@/lib/scoreConverter/esatModules";
import {
  buildConverterCalibrationOffer,
  resolveOfferSection,
} from "@/lib/scoreConverter/converterPracticeOffer";
import { rememberGaSourcePage, trackEvent } from "@/lib/ga";

export function ScoreConverterQuestionBankPromo({
  open,
  exam,
  sections,
  activeSection,
  onDismiss,
  className,
}: {
  open: boolean;
  exam: ConverterExam;
  sections: ConvertedSection[];
  activeSection?: ConvertedSection | null;
  onDismiss: () => void;
  className?: string;
}) {
  const section = resolveOfferSection(sections, activeSection);
  const copy = buildConverterCalibrationOffer(exam, section);

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
            "relative overflow-hidden rounded-organic-xl bg-surface-mid",
            className,
          )}
        >
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[inherit]",
              "bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)]",
              "bg-[length:10px_10px]",
              "dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]",
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-secondary/[0.08]"
          />

          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-3 z-10 rounded-organic-md p-1.5 text-text/60 transition-colors hover:bg-background/20 hover:text-text sm:right-4 sm:top-4"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div
            className="pointer-events-none absolute -right-2 top-1/2 h-32 w-32 -translate-y-1/2 opacity-[0.1] sm:right-2 sm:h-40 sm:w-40"
            aria-hidden
          >
            <BrandMarkImage className="h-full w-full object-contain" alt="" />
          </div>

          <div className="relative z-10 flex min-h-[7.5rem] flex-col justify-center gap-5 px-6 py-8 pr-12 sm:min-h-[8.5rem] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-10 sm:pr-16">
            <div className="min-w-0 flex-1">
              <h2
                id="score-converter-qb-promo-title"
                className="text-lg font-bold tracking-tight text-text sm:text-xl"
              >
                {copy.headline}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text/75 sm:text-base">
                {copy.description}
              </p>
            </div>

            <Link
              href={copy.href}
              onClick={() => {
                rememberGaSourcePage("/tools/score-converter");
                trackEvent("converter_cta_click", {
                  cta_name: "start_calibration",
                  source_page: "score_converter",
                  module: copy.moduleSlug,
                  destination: copy.href,
                  exam,
                });
                onDismiss();
              }}
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-fast",
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
