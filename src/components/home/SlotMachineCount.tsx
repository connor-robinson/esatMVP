"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const REEL_COPIES = 8;
const ROW_EM = 1.1;

interface SlotMachineCountProps {
  value: number;
  className?: string;
  digitClassName?: string;
}

function digitAt(value: number, place: number, length: number): number {
  const padded = String(Math.max(0, Math.floor(value))).padStart(length, "0");
  return Number(padded[place] ?? 0);
}

function SlotDigit({
  digit,
  delayMs,
  className,
}: {
  digit: number;
  delayMs: number;
  className?: string;
}) {
  const [settled, setSettled] = useState(false);
  const strip = Array.from({ length: REEL_COPIES }, () => DIGITS).flat();
  const stopIndex = (REEL_COPIES - 2) * 10 + digit;

  useEffect(() => {
    setSettled(false);
    // Wait a paint so the 0 → target transition actually runs.
    const start = window.setTimeout(() => setSettled(true), 50);
    return () => window.clearTimeout(start);
  }, [digit]);

  return (
    <span
      className={cn(
        "relative inline-flex h-[1.1em] w-[0.65em] overflow-hidden rounded-lg bg-white/5",
        className,
      )}
      aria-hidden
    >
      <span
        className="flex flex-col items-center will-change-transform"
        style={{
          transform: settled
            ? `translateY(-${stopIndex * ROW_EM}em)`
            : "translateY(0)",
          transition: settled
            ? `transform 1.85s cubic-bezier(0.12, 0.8, 0.2, 1) ${delayMs}ms`
            : "none",
        }}
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
  const safeValue = Math.max(0, Math.floor(value));
  const length = Math.max(4, String(safeValue).length);

  return (
    <span
      className={cn(
        "inline-flex items-end gap-1 text-5xl text-white sm:text-6xl lg:text-7xl",
        className,
      )}
      aria-label={`${safeValue} plus practice questions`}
    >
      {Array.from({ length }, (_, place) => (
        <SlotDigit
          key={`${length}-${place}-${digitAt(safeValue, place, length)}`}
          digit={digitAt(safeValue, place, length)}
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
