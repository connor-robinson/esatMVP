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
  "bg-white/[0.05] text-[#94A3B8] hover:bg-white/[0.08] hover:text-white";
const OPTION_SELECTED = "bg-white/10 text-white";

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
        <div className="space-y-4">
          <div className="text-sm leading-relaxed text-[#94A3B8] sm:text-[15px]">
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

        <div className="mt-3 space-y-3">
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
                    "inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color] duration-200",
                    "border-0 outline-none ring-0 shadow-none",
                    "focus-visible:outline-none focus-visible:ring-0",
                    isSelected
                      ? OPTION_SELECTED
                      : OPTION_BASE,
                  )}
                >
                  {id}
                </button>
              );
            })}
          </div>

          {phase === "submitted" ? (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#94A3B8]">
                Sign in to view which is correct.
              </p>
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5 focus-visible:outline-none"
              >
                Sign in to view answer
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="text-sm text-[#94A3B8] transition-colors hover:text-white"
              >
                Sign in for more?
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selected}
                className={cn(
                  "inline-flex items-center justify-center rounded-xl px-8 py-3 text-sm font-semibold transition-colors duration-200",
                  "border-0 outline-none focus-visible:outline-none",
                  selected
                    ? "bg-white text-[#0A0F1D] hover:bg-slate-200"
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
