"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_MIX_BLURBS,
  DIFFICULTY_MIX_PRESETS,
  type DifficultyMixPreset,
} from "@/lib/questionBank/difficultyMix";

const controlBase =
  "border-0 shadow-none outline-none focus:outline-none focus:ring-0 focus:border-0";

const PRESET_ACCENT: Record<
  DifficultyMixPreset,
  {
    thumb: string;
    fill: string;
    markActive: string;
    markIdle: string;
    labelActive: string;
    labelIdle: string;
  }
> = {
  Auto: {
    thumb: "bg-secondary",
    fill: "bg-secondary/50",
    markActive: "bg-secondary",
    markIdle: "bg-surface-neutral",
    labelActive: "text-text",
    labelIdle: "text-text-subtle hover:text-text-muted",
  },
  Easy: {
    thumb: "bg-difficulty-pill-easy",
    fill: "bg-difficulty-pill-easy/55",
    markActive: "bg-difficulty-pill-easy",
    markIdle: "bg-difficulty-pill-easy/35",
    labelActive: "text-difficulty-pill-easy",
    labelIdle: "text-difficulty-pill-easy/55 hover:text-difficulty-pill-easy/80",
  },
  Medium: {
    thumb: "bg-difficulty-pill-medium",
    fill: "bg-difficulty-pill-medium/55",
    markActive: "bg-difficulty-pill-medium",
    markIdle: "bg-difficulty-pill-medium/35",
    labelActive: "text-difficulty-pill-medium",
    labelIdle:
      "text-difficulty-pill-medium/55 hover:text-difficulty-pill-medium/80",
  },
  Hard: {
    thumb: "bg-difficulty-pill-hard",
    fill: "bg-difficulty-pill-hard/55",
    markActive: "bg-difficulty-pill-hard",
    markIdle: "bg-difficulty-pill-hard/35",
    labelActive: "text-difficulty-pill-hard",
    labelIdle: "text-difficulty-pill-hard/55 hover:text-difficulty-pill-hard/80",
  },
};

const SNAP_EASE = "cubic-bezier(0.34, 1.45, 0.64, 1)";

type Props = {
  value: DifficultyMixPreset;
  onChange: (value: DifficultyMixPreset) => void;
};

export function DifficultyMixSlider({ value, onChange }: Props) {
  const options = DIFFICULTY_MIX_PRESETS;
  const index = Math.max(0, options.indexOf(value));
  const max = options.length - 1;
  const pct = max === 0 ? 0 : (index / max) * 100;
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [visualPct, setVisualPct] = useState(pct);
  const [liveValue, setLiveValue] = useState(value);
  const labelId = useId();
  const snapTimerRef = useRef<number | null>(null);

  const accentFor = (preset: DifficultyMixPreset) => PRESET_ACCENT[preset];
  const activeAccent = accentFor(liveValue);

  useEffect(() => {
    if (dragging) return;
    setVisualPct(pct);
    setLiveValue(value);
  }, [pct, dragging, value]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current != null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const ratioFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const presetFromRatio = (ratio: number) => {
    const nextIndex = Math.round(ratio * max);
    return options[nextIndex] ?? options[0]!;
  };

  const snapPctFor = (preset: DifficultyMixPreset) =>
    max === 0 ? 0 : (options.indexOf(preset) / max) * 100;

  const triggerSnap = (preset: DifficultyMixPreset) => {
    const snapPct = snapPctFor(preset);
    setVisualPct(snapPct);
    setLiveValue(preset);
    setSnapping(true);
    if (snapTimerRef.current != null) {
      window.clearTimeout(snapTimerRef.current);
    }
    snapTimerRef.current = window.setTimeout(() => {
      setSnapping(false);
      snapTimerRef.current = null;
    }, 320);
  };

  const applyFromClientX = (
    clientX: number,
    { commitVisual }: { commitVisual: boolean },
  ) => {
    const ratio = ratioFromClientX(clientX);
    if (commitVisual) {
      setVisualPct(ratio * 100);
    }
    const next = presetFromRatio(ratio);
    setLiveValue(next);
    if (next !== value) onChange(next);
  };

  const selectPreset = (preset: DifficultyMixPreset) => {
    onChange(preset);
    triggerSnap(preset);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      applyFromClientX(event.clientX, { commitVisual: true });
    };
    const onUp = (event: PointerEvent) => {
      const ratio = ratioFromClientX(event.clientX);
      const next = presetFromRatio(ratio);
      onChange(next);
      setDragging(false);
      triggerSnap(next);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind while dragging
  }, [dragging, max, onChange, options, value]);

  return (
    <div className="space-y-3 pt-1">
      <div
        ref={trackRef}
        className={cn(
          "relative h-8 touch-none select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          setSnapping(false);
          setDragging(true);
          applyFromClientX(event.clientX, { commitVisual: true });
        }}
      >
        {/* Base track with difficulty-tinted gradient aligned to snap points */}
        <div
          className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(to right, var(--color-surface-neutral) 0%, color-mix(in srgb, var(--color-difficulty-pill-easy) 42%, var(--color-surface-mid)) 33%, color-mix(in srgb, var(--color-difficulty-pill-medium) 42%, var(--color-surface-mid)) 66%, color-mix(in srgb, var(--color-difficulty-pill-hard) 42%, var(--color-surface-mid)) 100%)",
          }}
        />

        {/* Active fill to thumb */}
        <div
          className={cn(
            "absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full",
            activeAccent.fill,
            dragging
              ? "transition-none"
              : "transition-[width,background-color] duration-300",
          )}
          style={{
            width: `${visualPct}%`,
            transitionTimingFunction: dragging ? undefined : SNAP_EASE,
          }}
        />

        {options.map((option, optionIndex) => {
          const markPct = max === 0 ? 0 : (optionIndex / max) * 100;
          const reached = optionIndex <= index;
          const isLive = option === liveValue;
          const markAccent = accentFor(option);
          return (
            <button
              key={option}
              type="button"
              aria-label={option}
              onClick={(event) => {
                event.stopPropagation();
                selectPreset(option);
              }}
              className={cn(
                "absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full",
                reached || isLive ? markAccent.markActive : markAccent.markIdle,
                "transition-[transform,background-color] duration-300",
                isLive && snapping && "scale-125",
                dragging ? "cursor-grabbing" : "cursor-grab",
                controlBase,
              )}
              style={{
                left: `${markPct}%`,
                transitionTimingFunction: SNAP_EASE,
              }}
            />
          );
        })}

        <div
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={index}
          aria-valuetext={value}
          aria-labelledby={labelId}
          className={cn(
            "absolute top-1/2 z-[2] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm",
            activeAccent.thumb,
            dragging ? "cursor-grabbing scale-110" : "cursor-grab",
            snapping && !dragging && "scale-110",
            dragging
              ? "transition-none"
              : "transition-[left,transform,background-color] duration-300",
            "focus-visible:ring-2 focus-visible:ring-secondary/35",
            controlBase,
          )}
          style={{
            left: `${visualPct}%`,
            transitionTimingFunction: dragging ? undefined : SNAP_EASE,
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              selectPreset(options[Math.min(max, index + 1)]!);
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              selectPreset(options[Math.max(0, index - 1)]!);
            }
            if (event.key === "Home") {
              event.preventDefault();
              selectPreset(options[0]!);
            }
            if (event.key === "End") {
              event.preventDefault();
              selectPreset(options[max]!);
            }
          }}
        />
      </div>

      <div className="flex justify-between gap-1 px-0.5">
        {options.map((option) => {
          const labelAccent = accentFor(option);
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => selectPreset(option)}
              className={cn(
                "min-w-0 flex-1 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 sm:text-xs",
                active ? labelAccent.labelActive : labelAccent.labelIdle,
                controlBase,
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      <span id={labelId} className="sr-only">
        Difficulty mix: {DIFFICULTY_MIX_BLURBS[value]}
      </span>
    </div>
  );
}
