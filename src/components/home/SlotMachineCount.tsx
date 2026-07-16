"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const REEL_COPIES = 8;

interface SlotMachineCountProps {
  value: number | null;
  className?: string;
  digitClassName?: string;
}

function digitAt(value: number, place: number, length: number): number {
  const padded = String(Math.max(0, Math.floor(value))).padStart(length, "0");
  return Number(padded[place] ?? 0);
}

function SlotDigit({
  digit,
  spinning,
  delayMs,
  className,
}: {
  digit: number;
  spinning: boolean;
  delayMs: number;
  className?: string;
}) {
  const strip = Array.from({ length: REEL_COPIES }, () => DIGITS).flat();
  const stopIndex = (REEL_COPIES - 2) * 10 + digit;

  return (
    <span
      className={cn(
        "relative inline-flex h-[1.1em] w-[0.65em] overflow-hidden rounded-lg bg-white/5",
        className,
      )}
      aria-hidden
    >
      <span
        className={cn(
          "flex flex-col items-center will-change-transform",
          spinning && "animate-[slot-spin_0.45s_linear_infinite]",
        )}
        style={
          spinning
            ? undefined
            : {
                transform: `translateY(-${stopIndex * 1.1}em)`,
                transition: `transform 1.7s cubic-bezier(0.12, 0.8, 0.2, 1) ${delayMs}ms`,
              }
        }
      >
        {strip.map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="flex h-[1.1em] w-full items-center justify-center font-display font-bold tabular-nums leading-none"
          >
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export function SlotMachineCount({
  value,
  className,
  digitClassName,
}: SlotMachineCountProps) {
  const [spinning, setSpinning] = useState(true);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value == null || value <= 0) return;

    setSpinning(true);
    setDisplayValue(value);

    const stop = window.setTimeout(() => setSpinning(false), 700);
    return () => window.clearTimeout(stop);
  }, [value]);

  const length = Math.max(4, String(displayValue || 0).length);
  const ready = value != null && value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-end gap-1 text-5xl text-white sm:text-6xl lg:text-7xl",
        className,
      )}
      aria-label={
        ready ? `${value} plus practice questions` : "Loading question count"
      }
    >
      {Array.from({ length }, (_, place) => (
        <SlotDigit
          key={`${length}-${place}`}
          digit={ready ? digitAt(displayValue, place, length) : 0}
          spinning={!ready || spinning}
          delayMs={place * 140}
          className={digitClassName}
        />
      ))}
      <span className="pb-1 font-display font-bold leading-none text-[#3B82F6]">
        +
      </span>
    </span>
  );
}
