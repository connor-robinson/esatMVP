"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import { cn } from "@/lib/utils";
import type { ConverterExam, ConvertedSection } from "@/lib/scoreConverter/esatModules";
import {
  buildConverterPracticeOffer,
  CONVERTER_PRICING_CTA_HREF,
  freePracticeHrefForSubject,
  resolveOfferSection,
} from "@/lib/scoreConverter/converterPracticeOffer";
import { writeFreeTierLaunch } from "@/lib/questionBank/freeTierLaunch";
import {
  currentGaPath,
  rememberGaSourcePage,
  trackEvent,
} from "@/lib/ga";

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
  const router = useRouter();
  const offerViewedKey = useRef<string | null>(null);
  const section = resolveOfferSection(sections, activeSection);
  const copy = buildConverterPracticeOffer(exam, section);
  const practiceHref = freePracticeHrefForSubject(copy.subject);
  const converterPage = currentGaPath() ?? "/tools/score-converter";

  useEffect(() => {
    if (!open) return;
    const onceKey = `${exam}:${copy.subject}:${converterPage}`;
    if (offerViewedKey.current === onceKey) return;
    offerViewedKey.current = onceKey;
    trackEvent("converter_offer_viewed", {
      exam,
      subject: copy.subject,
      source_page: converterPage,
    });
  }, [open, exam, copy.subject, converterPage]);

  const trackCta = (
    event:
      | "converter_cta_click"
      | "converter_free_practice_started",
    ctaName: string,
    destination: string,
  ) => {
    rememberGaSourcePage(converterPage);
    trackEvent(event, {
      cta_name: ctaName,
      destination,
      exam,
      subject: copy.subject,
      source_page: converterPage,
      converter_page: converterPage,
    });
  };

  const startFreePractice = () => {
    writeFreeTierLaunch(copy.subject);
    trackCta(
      "converter_cta_click",
      "start_free_practice",
      practiceHref,
    );
    trackCta(
      "converter_free_practice_started",
      "start_free_practice",
      practiceHref,
    );
    onDismiss();
    router.push(practiceHref);
  };

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
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-secondary/[0.12]"
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
              <p className="mt-3 text-xs text-text/55 sm:text-sm">
                {copy.support}
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:min-w-[14rem]">
              <button
                type="button"
                onClick={startFreePractice}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-fast",
                  "bg-primary text-background hover:bg-primary-hover active:scale-[0.98]",
                )}
              >
                <span>{copy.primaryCta}</span>
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              </button>
              <Link
                href={CONVERTER_PRICING_CTA_HREF}
                onClick={() => {
                  trackCta(
                    "converter_cta_click",
                    "view_full_access",
                    CONVERTER_PRICING_CTA_HREF,
                  );
                  onDismiss();
                }}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-fast",
                  "bg-background/80 text-text hover:brightness-95 active:scale-[0.98]",
                )}
              >
                <span>{copy.secondaryCta}</span>
              </Link>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
