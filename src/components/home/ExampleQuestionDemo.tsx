"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { StemContent } from "@/components/shared/StemContent";
import {
  HOMEPAGE_EXAMPLE_QUESTION,
  markHomepageExampleRevealPending,
} from "@/lib/homepage/exampleQuestion";

type Phase = "idle" | "submitted";

export function ExampleQuestionDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const selectedOption = useMemo(
    () => HOMEPAGE_EXAMPLE_QUESTION.options.find((o) => o.label === selected) ?? null,
    [selected],
  );

  const isCorrect =
    phase === "submitted" && selected === HOMEPAGE_EXAMPLE_QUESTION.correctLabel;

  const handleSubmit = () => {
    if (!selected) return;
    setPhase("submitted");
  };

  return (
    <div className="rounded-2xl bg-[#0A0F1D]/60 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
        Example question
      </p>

      <div className="mt-5 text-base leading-relaxed text-white sm:text-lg">
        <StemContent
          content={HOMEPAGE_EXAMPLE_QUESTION.promptMarkdown}
          className="text-inherit"
        />
      </div>

      <div
        className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Answer options"
      >
        {HOMEPAGE_EXAMPLE_QUESTION.options.map((option) => {
          const active = selected === option.label;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setSelected(option.label);
                setPhase("idle");
              }}
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
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

        <Link
          href="/login?mode=signup&redirectTo=%2F%3Freveal_example%3D1"
          onClick={() => markHomepageExampleRevealPending()}
          className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#2563EB]"
        >
          Sign up to find out
        </Link>
      </div>

      {phase === "submitted" ? (
        <div className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-sm text-[#94A3B8]">
          {isCorrect ? (
            <p className="font-semibold text-[#3B82F6]">
              Correct — you picked {selectedOption?.label} ({selectedOption?.text}).
            </p>
          ) : (
            <p>
              Nice try
              {selectedOption
                ? ` — you picked ${selectedOption.label} (${selectedOption.text})`
                : ""}
              . Sign up to reveal the answer and explanation.
            </p>
          )}
          {!isCorrect ? (
            <p className="mt-2 text-xs text-white/50">
              The full solution unlocks after you create an account.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-white/45">
          Choose an option, submit your answer, or sign up to reveal the solution.
        </p>
      )}
    </div>
  );
}
