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

        <div className="mt-4 space-y-4">
          <div className="text-[13px] leading-snug text-slate-300 sm:text-sm sm:leading-relaxed">
            <p>
              A person of fixed height stands directly in front of a camera.
              They move further away from the camera. The camera position and
              zoom do not change.
            </p>
            <p className="mt-2">
              Which labelled curve could show the height{" "}
              <InlineKatex latex="H" fallback="H" /> of their image in the photo
              against distance{" "}
              <InlineKatex latex="d" fallback="d" /> from the camera?
            </p>
          </div>

          <div className="min-h-[200px] w-full sm:min-h-[260px]">
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
                    "inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-200",
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

          {phase === "submitted" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Sign in to view which is correct.
              </p>
              <Link
                href={`/login?redirectTo=${encodeURIComponent(REVEAL_REDIRECT)}`}
                onClick={() => markHomepageExampleRevealPending()}
                className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
              >
                Sign in to view answer
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Pick an option, then submit.
              </p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
