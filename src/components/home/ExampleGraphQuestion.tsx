"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LazyInlineMath } from "@/components/home/LazyInlineMath";
import { markHomepageExampleRevealPending } from "@/lib/homepage/exampleQuestion";
import {
  MainReciprocalGraph,
  OPTION_GRAPHS,
  OptionReciprocalGraph,
  type OptionGraphId,
} from "@/components/home/ReciprocalQuestionGraphs";

type SubmitPhase = "idle" | "submitted";

const REVEAL_REDIRECT = "/dashboard?reveal_example=1";

export function ExampleGraphQuestion({ className }: { className?: string }) {
  const [selected, setSelected] = useState<OptionGraphId | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");

  const handleSelect = useCallback((id: OptionGraphId) => {
    setSelected(id);
    setPhase("idle");
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selected) return;
    setPhase("submitted");
  }, [selected]);

  return (
    <div
      className={cn(
        "relative rounded-[28px] border border-white/10 bg-[#0f1728]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.35)]",
        "px-6 py-8 sm:px-[38px] sm:py-[38px] sm:pb-8",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px] opacity-60"
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
              <LazyInlineMath latex="y = f(x)" fallback="y = f(x)" />.
              {" "}Which graph could represent{" "}
              <LazyInlineMath latex="\\frac{1}{f(x)}" fallback="y = 1/f(x)" />
              ?
            </p>
          </div>

          <div className="h-[220px] w-full sm:h-[240px]">
            <MainReciprocalGraph className="h-full w-full" />
          </div>
        </div>

        <div className="my-6 border-t border-white/10" aria-hidden />

        <div>
          <div
            className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="radiogroup"
            aria-label="Answer options"
          >
            {OPTION_GRAPHS.map((option) => {
              const isSelected = selected === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(option.id)}
                  className={cn(
                    "group relative flex w-[calc(50%-7px)] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] border text-left transition-all duration-200",
                    "min-h-[158px] bg-[#101a2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                    isSelected
                      ? "border-white/40 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_20px_rgba(59,130,246,0.14)]"
                      : "border-white/10 hover:-translate-y-px hover:border-white/22",
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
                      className="h-full w-full min-h-[118px]"
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">Scroll right for more options.</p>
        </div>

        {phase === "submitted" ? (
          <div className="mt-7 rounded-2xl bg-white/[0.06] px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-sm font-semibold text-white">Answer locked in.</p>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to view whether you got it right and see the worked
              solution.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/[0.14]"
              >
                Sign in to view answer
              </Link>
              <Link
                href={`/login?mode=signup&redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
              >
                Sign up for free
              </Link>
            </div>
          </div>
        ) : (
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
            <p className="text-sm text-slate-400">Pick an option, then submit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
