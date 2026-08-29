"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { LazyStemContent } from "@/components/home/LazyStemContent";
import {
  CORRECT_OPTION_ID,
  MainReciprocalGraph,
  OPTION_GRAPHS,
  OptionReciprocalGraph,
  RECIPROCAL_EXPLANATION_MARKDOWN,
  type OptionGraphId,
} from "@/components/home/ReciprocalQuestionGraphs";

const PROMPT_MARKDOWN = [
  "The graph shown is $y = f(x)$.",
  "",
  "Which graph could represent $y = \\dfrac{1}{f(x)}$ ?",
].join("\n");

type SubmitPhase = "idle" | "correct" | "incorrect";

export function ExampleGraphQuestion({ className }: { className?: string }) {
  const [selected, setSelected] = useState<OptionGraphId | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");

  const handleSelect = useCallback((id: OptionGraphId) => {
    setSelected(id);
    setPhase("idle");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setPhase(selected === CORRECT_OPTION_ID ? "correct" : "incorrect");
  }, [selected]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1728]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.35)]",
        "px-6 py-8 sm:px-8 sm:py-9 lg:px-10 lg:py-10",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 85% 15%, rgba(59,130,246,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(255,255,255,0.04), transparent 50%)",
        }}
      />

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Example question
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          <div className="space-y-4 text-lg leading-relaxed text-white sm:text-xl lg:pt-2">
            <LazyStemContent content={PROMPT_MARKDOWN} className="text-inherit" />
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[340px] rounded-[22px] border border-white/[0.08] bg-[#101a2d]/80 p-3 sm:max-w-none sm:p-4">
              <MainReciprocalGraph width={320} height={220} className="mx-auto w-full max-w-full" />
            </div>
          </div>
        </div>

        <div className="my-8 border-t border-white/10" aria-hidden />

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5"
          role="radiogroup"
          aria-label="Answer options"
        >
          {OPTION_GRAPHS.map((option) => {
            const isSelected = selected === option.id;
            const showCorrect = phase !== "idle" && option.isCorrect;
            const showIncorrect =
              phase === "incorrect" && isSelected && !option.isCorrect;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(option.id)}
                className={cn(
                  "group flex flex-col rounded-[22px] border p-4 text-left transition-all duration-200",
                  "bg-[#101a2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60",
                  isSelected
                    ? "border-white/35 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_24px_rgba(59,130,246,0.18)]"
                    : "border-white/10 hover:-translate-y-0.5 hover:border-white/20",
                  showCorrect && "border-[#34D399]/50",
                  showIncorrect && "border-[#F87171]/45",
                )}
              >
                <span
                  className={cn(
                    "mb-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold",
                    isSelected
                      ? "bg-white/15 text-white"
                      : "bg-white/[0.06] text-slate-300",
                  )}
                >
                  {option.id}
                </span>
                <div className="flex flex-1 items-center justify-center">
                  <OptionReciprocalGraph
                    option={option}
                    width={160}
                    height={112}
                    className="w-full max-w-[180px]"
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected}
            className={cn(
              "inline-flex items-center justify-center rounded-2xl px-8 py-4 text-sm font-semibold transition-all duration-200",
              selected
                ? "bg-white/10 text-white/90 hover:bg-white/[0.14]"
                : "cursor-not-allowed bg-white/[0.06] text-white/40",
            )}
          >
            Submit
          </button>
          <p className="text-sm text-slate-400">
            {phase === "idle"
              ? "Pick an option and submit."
              : phase === "correct"
                ? "Correct. Nice reasoning."
                : "Not quite. Compare the asymptotes and branch signs."}
          </p>
        </div>

        {phase !== "idle" ? (
          <div
            className={cn(
              "mt-6 rounded-2xl border px-5 py-4 sm:px-6",
              phase === "correct"
                ? "border-[#34D399]/25 bg-[#34D399]/10"
                : "border-white/10 bg-white/[0.04]",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                phase === "correct" ? "text-[#6EE7B7]" : "text-slate-200",
              )}
            >
              {phase === "correct" ? "Well done." : "Hint"}
            </p>
            <div className="mt-2 text-sm leading-relaxed text-slate-300">
              <LazyStemContent
                content={RECIPROCAL_EXPLANATION_MARKDOWN}
                className="text-inherit"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
