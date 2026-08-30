"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { InlineKatex } from "@/components/home/InlineKatex";
import { CameraDistanceGraph } from "@/components/home/CameraDistanceGraph";
import { markHomepageExampleRevealPending } from "@/lib/homepage/exampleQuestion";
import {
  CAMERA_DISTANCE_EXPLANATION,
  CORRECT_CAMERA_CURVE,
  type CurveId,
} from "@/lib/homepage/cameraDistanceCurves";

type SubmitPhase = "idle" | "submitted";

const OPTION_IDS: CurveId[] = ["A", "B", "C", "D"];
const REVEAL_REDIRECT = "/dashboard?reveal_example=1";

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

  const isCorrect = phase === "submitted" && selected === CORRECT_CAMERA_CURVE;

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

        <div className="mt-5 grid grid-cols-1 gap-6 min-[560px]:grid-cols-[0.75fr_1.25fr] min-[560px]:gap-7">
          <div className="min-w-0 text-[22px] leading-[1.45] text-slate-200 sm:text-[23px]">
            <p>A person of fixed height stands directly in front of a camera.</p>
            <p className="mt-3">
              They move further away from the camera. The camera position and
              zoom do not change.
            </p>
            <p className="mt-3">
              Which labelled curve could show the height{" "}
              <InlineKatex latex="H" fallback="H" /> of their image in the photo
              against distance{" "}
              <InlineKatex latex="d" fallback="d" /> from the camera?
            </p>
          </div>

          <div className="min-h-[220px] w-full min-[560px]:min-h-[300px]">
            <CameraDistanceGraph className="h-full w-full" />
          </div>
        </div>

        <div className="my-5 border-t border-white/10 sm:my-6" aria-hidden />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div
            className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4 sm:max-w-[17rem] sm:gap-2.5"
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
                    "inline-flex h-11 items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                    isSelected
                      ? "border border-[#3B82F6]/55 bg-white/[0.08] text-white shadow-[0_0_18px_rgba(59,130,246,0.16)]"
                      : "border border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/22 hover:text-white",
                  )}
                >
                  {id}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {phase === "submitted" ? (
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-sm sm:text-right",
                  isCorrect
                    ? "bg-emerald-500/10 text-emerald-100"
                    : "bg-amber-500/10 text-amber-100",
                )}
              >
                <p className="font-semibold text-white">
                  {isCorrect ? "Correct." : "Not quite."}
                </p>
                <p className="mt-1 text-slate-300">
                  {isCorrect
                    ? CAMERA_DISTANCE_EXPLANATION
                    : "Try another curve, or sign in for the full worked solution."}
                </p>
                {!isCorrect ? (
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                    onClick={() => markHomepageExampleRevealPending()}
                    className="mt-2 inline-flex text-sm font-semibold text-white/85 underline-offset-2 hover:text-white hover:underline"
                  >
                    Sign in to view answer
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!selected}
                  className={cn(
                    "inline-flex items-center justify-center rounded-2xl px-8 py-3.5 text-sm font-semibold transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                    selected
                      ? "bg-white/10 text-white/90 hover:bg-white/[0.14]"
                      : "cursor-not-allowed bg-white/[0.06] text-white/40",
                  )}
                >
                  Submit
                </button>
                <p className="text-sm text-slate-400">
                  Pick an option, then submit.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
