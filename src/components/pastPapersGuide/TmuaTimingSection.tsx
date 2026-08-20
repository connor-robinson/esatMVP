"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PRESETS = [
  { id: "tmua", label: "Original TMUA", minutes: 3.75 },
  { id: "bridge", label: "ESAT CAMP bridge pace", minutes: 2.25 },
  { id: "esat", label: "ESAT pace", minutes: 1.48 },
] as const;

/** Pacing helper shown under the TMUA structure overview. */
export function TmuaTimingSection() {
  const [preset, setPreset] = useState<(typeof PRESETS)[number]["id"]>("bridge");
  const active = PRESETS.find((item) => item.id === preset) ?? PRESETS[1];

  return (
    <div className="rounded-2xl bg-white/[0.035] p-5 sm:p-6">
      <p className="text-sm font-semibold text-white">Paper 1 pacing for ESAT</p>
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
        Original TMUA averages 3.75 minutes per question. For ESAT speed work,
        aim closer to 1.5–2.5 minutes.
      </p>
    </div>
  );
}
