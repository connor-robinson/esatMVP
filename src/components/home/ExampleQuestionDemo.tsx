"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StemContent } from "@/components/shared/StemContent";
import {
  HOMEPAGE_SPEED_QUESTION,
  HOMEPAGE_STARTER_QUESTION,
  markHomepageExampleRevealPending,
  type HomepageExampleQuestion,
} from "@/lib/homepage/exampleQuestion";

type Phase = "idle" | "feedback";
type DemoStep = "starter" | "harder";

const QUESTIONS: Record<DemoStep, HomepageExampleQuestion> = {
  starter: HOMEPAGE_STARTER_QUESTION,
  harder: HOMEPAGE_SPEED_QUESTION,
};

const NEXT_HARDER: Partial<Record<DemoStep, DemoStep>> = {
  starter: "harder",
};

export function ExampleQuestionDemo({
  variant = "default",
  className,
}: {
  variant?: "default" | "hero";
  className?: string;
}) {
  const [step, setStep] = useState<DemoStep>("starter");
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const question = QUESTIONS[step];
  const feedback = useMemo(() => {
    if (!selected) return null;
    return question.feedbackByLabel[selected] ?? null;
  }, [question, selected]);

  const goHarder = () => {
    const next = NEXT_HARDER[step];
    if (!next) return;
    setStep(next);
    setSelected(null);
    setPhase("idle");
  };

  const tryAgain = () => {
    setSelected(null);
    setPhase("idle");
  };

  const handleSubmit = () => {
    if (!selected) return;
    setPhase("feedback");
  };

  const canGoHarder = Boolean(NEXT_HARDER[step]);

  return (
    <div
      className={cn(
        variant === "hero"
          ? "relative flex w-full max-w-none flex-col overflow-hidden rounded-3xl bg-white/[0.08] p-6 backdrop-blur-xl sm:max-w-[28rem] sm:p-8 lg:min-h-[34rem] lg:p-10"
          : "rounded-2xl bg-[#0A0F1D]/60 p-6 sm:p-8",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
          Example question
        </p>
        {step !== "starter" ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3B82F6]">
            Harder question
          </p>
        ) : null}
      </div>

      {phase === "feedback" && feedback ? (
        <div className="mt-5 flex flex-1 flex-col">
          <p
            className={cn(
              "text-lg font-bold",
              feedback.primaryAction === "harder"
                ? "text-[#34D399]"
                : "text-white",
            )}
          >
            {feedback.headline}
          </p>
          <div className="mt-3 text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            <StemContent content={feedback.bodyMarkdown} className="text-inherit" />
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-6">
            {feedback.primaryAction === "harder" && canGoHarder ? (
              <button
                type="button"
                onClick={goHarder}
                className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#2563EB]"
              >
                Try a harder question
              </button>
            ) : feedback.primaryAction === "try_again" &&
              step === "harder" &&
              selected === question.correctLabel ? (
              <Link
                href="/login?mode=signup&redirectTo=%2F%3Freveal_example%3D1"
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#2563EB]"
              >
                Sign up for more
              </Link>
            ) : (
              <button
                type="button"
                onClick={tryAgain}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0A0F1D] transition-all hover:bg-slate-200"
              >
                Try again
              </button>
            )}

            {canGoHarder && feedback.primaryAction !== "harder" ? (
              <button
                type="button"
                onClick={goHarder}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                Try a harder question
              </button>
            ) : null}

            {!(
              step === "harder" &&
              selected === question.correctLabel &&
              feedback.primaryAction === "try_again"
            ) ? (
              <Link
                href="/login?mode=signup&redirectTo=%2F%3Freveal_example%3D1"
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-white"
              >
                Sign up for more
              </Link>
            ) : (
              <button
                type="button"
                onClick={tryAgain}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-[#94A3B8] transition-colors hover:text-white"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 text-base leading-relaxed text-white sm:text-lg">
            <StemContent
              content={question.promptMarkdown}
              className="text-inherit"
            />
          </div>

          <div
            className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Answer options"
          >
            {question.options.map((option) => {
              const active = selected === option.label;
              return (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(option.label)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    active
                      ? "bg-[#3B82F6] text-white"
                      : "bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white",
                  )}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span>{option.text}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition-all",
                  selected
                    ? "bg-white text-[#0A0F1D] hover:bg-slate-200"
                    : "cursor-not-allowed bg-white/10 text-white/40",
                )}
              >
                Submit
              </button>
              <p className="text-xs text-white/45">Pick an option and submit.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {canGoHarder ? (
                <button
                  type="button"
                  onClick={goHarder}
                  className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Try a harder question
                </button>
              ) : null}
              <Link
                href="/login?mode=signup&redirectTo=%2F%3Freveal_example%3D1"
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#93C5FD] transition-colors hover:text-white"
              >
                Sign up for more
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
