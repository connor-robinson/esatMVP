"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "tmua", label: "Original TMUA", minutes: 3.75 },
  { id: "bridge", label: "ESAT CAMP bridge pace", minutes: 2.25 },
  { id: "esat", label: "ESAT pace", minutes: 1.48 },
] as const;

export function TmuaTimingSection() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("bridge");
  const active = PRESETS.find((item) => item.id === preset) ?? PRESETS[1];

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-lg font-display font-bold text-white">
        TMUA is supplementary Mathematics practice. It gives you nothing for
        Physics, Chemistry or Biology.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#9B8AA8]/30 bg-[#9B8AA8]/10 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-[#C4B5D5]">
            Paper 1
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold text-white">
            Applications of Mathematical Knowledge
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
            20 multiple-choice questions in 75 minutes. It tests how well you
            apply familiar Mathematics in unfamiliar situations. The style can
            be useful for Mathematics 2, but individual questions are generally
            longer than ESAT questions.
          </p>
          <p className="mt-4 text-sm text-[#CBD5E1]">
            Recommended use: work at roughly 2 to 2.5 minutes per question. Do
            not copy the original 3.75-minute TMUA average if your goal is ESAT
            speed.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 opacity-80">
          <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Paper 2
          </p>
          <h3 className="mt-2 font-display text-xl font-bold text-[#94A3B8]">
            Mathematical Reasoning
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-[#64748B]">
            20 multiple-choice questions in 75 minutes. Lower priority for ESAT.
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white">
          Paper 1 pacing presets
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset === item.id}
              onClick={() => setPreset(item.id)}
              className={cn(
                "min-h-11 rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
                preset === item.id
                  ? "bg-[#9B8AA8] text-white"
                  : "bg-white/5 text-[#94A3B8] hover:text-white",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-4 font-mono text-2xl font-bold text-white">
          {active.minutes.toFixed(2)} min / question
        </p>
        <p className="mt-2 text-sm text-[#94A3B8]">
          This preset explains pacing only. It is not an official UAT-UK
          recommendation.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-[#94A3B8]">
        Use Paper 1 as extra Mathematics 2 practice after ENGAA Part B. Leave
        Paper 2 until you have exhausted more relevant material.
      </p>
    </div>
  );
}
