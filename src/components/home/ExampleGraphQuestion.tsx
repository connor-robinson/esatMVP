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
        "px-6 py-8 sm:px-[38px] sm:py-[38px] sm:pb-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 88% 12%, rgba(59,130,246,0.11), transparent 58%)",
        }}
      />

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Example question
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5">
          <div className="w-full max-w-none text-sm leading-snug text-slate-200 sm:text-[15px]">
            <p className="w-full">
              The graph shown is{" "}
              <LazyStemContent
                content="$y = f(x)$."
                className="inline text-inherit [&>div]:inline"
              />{" "}
              Which graph could represent{" "}
              <LazyStemContent
                content="$y = \\dfrac{1}{f(x)}$"
                className="inline text-inherit [&>div]:inline"
              />
              ?
            </p>
          </div>

          <div className="h-[220px] w-full sm:h-[240px]">
            <MainReciprocalGraph className="h-full w-full" />
          </div>
        </div>

        <div className="my-6 border-t border-white/10" aria-hidden />

        <div className="space-y-3.5" role="radiogroup" aria-label="Answer options">
          {[OPTION_GRAPHS.slice(0, 2), OPTION_GRAPHS.slice(2, 4)].map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-2 gap-3.5">
              {row.map((option) => {
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
                      "group relative flex min-h-[132px] flex-col overflow-hidden rounded-[18px] border text-left transition-all duration-200",
                      "bg-[#101a2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                      isSelected
                        ? "border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_20px_rgba(59,130,246,0.14)]"
                        : "border-white/10 hover:-translate-y-px hover:border-white/22",
                      showCorrect && "border-[#34D399]/45",
                      showIncorrect && "border-[#F87171]/40",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-3 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                        isSelected
                          ? "bg-white/15 text-white"
                          : "bg-white/[0.07] text-slate-300",
                      )}
                    >
                      {option.id}
                    </span>
                    <div className="flex flex-1 items-stretch px-2 pb-2 pt-9">
                      <OptionReciprocalGraph
                        option={option}
                        className="h-full w-full min-h-[100px]"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selected}
            className={cn(
              "inline-flex items-center justify-center rounded-2xl px-8 py-3.5 text-sm font-semibold transition-all duration-200",
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
              "mt-6 rounded-2xl border px-5 py-4",
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
