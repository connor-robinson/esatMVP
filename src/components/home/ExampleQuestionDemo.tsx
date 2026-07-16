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

const HIDDEN_LABELS = new Set(["C"]);

export function ExampleQuestionDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const options = useMemo(
    () =>
      HOMEPAGE_EXAMPLE_QUESTION.options.filter(
        (o) => !HIDDEN_LABELS.has(o.label),
      ),
    [],
  );

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
        {options.map((option) => {
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
        <div
          aria-hidden
          className="flex items-center justify-center rounded-xl bg-white/[0.03] px-3 py-2.5 text-lg text-white/25"
        >
          →
        </div>
      </div>

      {phase === "submitted" ? (
        <div className="mt-6 rounded-xl bg-[#3B82F6]/10 p-4 sm:p-5">
          <p className="text-sm font-semibold text-white">
            Answer locked in.
          </p>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Sign up to reveal whether you got it right, plus the full worked
            solution.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/login?mode=signup&redirectTo=%2F%3Freveal_example%3D1"
              onClick={() => markHomepageExampleRevealPending()}
              className="inline-flex items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#2563EB]"
            >
              Sign up for free
            </Link>
            <Link
              href="/login?redirectTo=%2F%3Freveal_example%3D1"
              onClick={() => markHomepageExampleRevealPending()}
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-[#94A3B8] transition-colors hover:text-white"
            >
              I already have an account
            </Link>
          </div>
        </div>
      ) : (
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
          <p className="text-xs text-white/45">
            Pick an option and submit — we&apos;ll reveal the answer after you
            sign up.
          </p>
        </div>
      )}
    </div>
  );
}
