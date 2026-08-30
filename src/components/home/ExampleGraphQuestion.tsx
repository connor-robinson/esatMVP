"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InlineKatex } from "@/components/home/InlineKatex";
import { CameraDistanceGraph } from "@/components/home/CameraDistanceGraph";
import { markHomepageExampleRevealPending } from "@/lib/homepage/exampleQuestion";
import type { CurveId } from "@/lib/homepage/cameraDistanceCurves";

type SubmitPhase = "idle" | "submitted";

const OPTION_IDS: CurveId[] = ["A", "B", "C", "D"];
const REVEAL_REDIRECT = "/dashboard?reveal_example=1";

const OPTION_BASE =
  "bg-white/[0.06] hover:bg-white/[0.09] dark:bg-surface-mid dark:hover:bg-surface-neutral";
const OPTION_SELECTED =
  "bg-white/[0.12] dark:bg-folder-card-selected";

export function ExampleGraphQuestion({ className }: { className?: string }) {
  const [selected, setSelected] = useState<CurveId | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");

  const handleSelect = useCallback((id: CurveId) => {
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
        "relative rounded-organic-xl bg-white/[0.08] px-6 py-8 backdrop-blur-xl sm:px-8 sm:py-9",
        className,
      )}
    >
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Example question
        </p>

        <div className="mt-4 space-y-4">
          <div className="text-sm leading-relaxed text-slate-300 sm:text-[15px]">
            <p>
              A person of fixed height moves away from a stationary camera with
              fixed zoom.
            </p>
            <p className="mt-2">
              Which curve could show their image height{" "}
              <InlineKatex latex="H" fallback="H" /> against distance{" "}
              <InlineKatex latex="d" fallback="d" /> from the camera?
            </p>
          </div>

          <div className="mx-auto w-full max-w-[85%] min-h-[170px] sm:min-h-[221px]">
            <CameraDistanceGraph className="h-full w-full" />
          </div>
        </div>

        <div className="my-5 border-t border-white/10 sm:my-6" aria-hidden />

        <div className="space-y-4">
          <div
            className="grid grid-cols-4 gap-2 sm:gap-2.5"
            role="group"
            aria-label="Answer options"
          >
            {OPTION_IDS.map((id) => {
              const isSelected = selected === id;

              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelect(id)}
                  className={cn(
                    "inline-flex h-11 w-full items-center justify-center rounded-organic-md text-sm font-semibold tabular-nums transition-[background-color] duration-200",
                    "border-0 outline-none ring-0 shadow-none",
                    "focus-visible:outline-none focus-visible:ring-0",
                    isSelected
                      ? cn(OPTION_SELECTED, "text-white")
                      : cn(OPTION_BASE, "text-slate-300 hover:text-white"),
                  )}
                >
                  {id}
                </button>
              );
            })}
          </div>

          {phase === "submitted" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Sign in to view which is correct.
              </p>
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-organic-md bg-white/[0.08] px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12] focus-visible:outline-none"
              >
                Sign in to view answer
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="text-sm text-slate-400 transition-colors hover:text-white"
              >
                Sign in for more?
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected}
                className={cn(
                  "inline-flex items-center justify-center rounded-organic-md px-8 py-3.5 text-sm font-semibold transition-colors duration-200",
                  "border-0 outline-none focus-visible:outline-none",
                  selected
                    ? "bg-white/[0.12] text-white hover:bg-white/[0.16]"
                    : "cursor-not-allowed bg-white/[0.05] text-white/40",
                )}
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
