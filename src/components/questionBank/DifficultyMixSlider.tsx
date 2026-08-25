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
  const labelId = useId();

  const setFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    const nextIndex = Math.round(Math.min(1, Math.max(0, ratio)) * max);
    const next = options[nextIndex];
    if (next) onChange(next);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => setFromClientX(event.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once while dragging
  }, [dragging, max, onChange]);

  return (
    <div className="space-y-3 pt-1">
      <div
        ref={trackRef}
        className="relative h-8 touch-none select-none"
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging(true);
          setFromClientX(event.clientX);
        }}
      >
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-mid" />
        <div
          className={cn(
            "absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-secondary/45",
            !dragging && "transition-[width] duration-300 ease-signature",
          )}
          style={{ width: `${pct}%` }}
        />

        {options.map((option, optionIndex) => {
          const markPct = max === 0 ? 0 : (optionIndex / max) * 100;
          const active = optionIndex <= index;
          return (
            <button
              key={option}
              type="button"
              aria-label={option}
              onClick={(event) => {
                event.stopPropagation();
                onChange(option);
              }}
              className={cn(
                "absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300",
                active ? "bg-secondary" : "bg-surface-neutral",
                controlBase,
              )}
              style={{ left: `${markPct}%` }}
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
            "absolute top-1/2 z-[2] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary shadow-sm",
            !dragging && "transition-[left] duration-300 ease-signature",
            "focus-visible:ring-2 focus-visible:ring-secondary/35",
            controlBase,
          )}
          style={{ left: `${pct}%` }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault();
              onChange(options[Math.min(max, index + 1)]!);
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault();
              onChange(options[Math.max(0, index - 1)]!);
            }
            if (event.key === "Home") {
              event.preventDefault();
              onChange(options[0]!);
            }
            if (event.key === "End") {
              event.preventDefault();
              onChange(options[max]!);
            }
          }}
        />
      </div>

      <div className="flex justify-between gap-1 px-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "min-w-0 flex-1 text-center text-[10px] font-semibold uppercase tracking-wide transition-colors duration-300 sm:text-xs",
              option === value
                ? "text-text"
                : "text-text-subtle hover:text-text-muted",
              controlBase,
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <p id={labelId} className="text-xs leading-relaxed text-text-muted">
        {DIFFICULTY_MIX_BLURBS[value]}
      </p>
    </div>
  );
}
