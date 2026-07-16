"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlotMachineCountProps {
  value: number;
  className?: string;
  digitClassName?: string;
}

function scramble(length: number, lockedPrefix: string): string {
  let out = lockedPrefix;
  for (let i = lockedPrefix.length; i < length; i += 1) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

export function SlotMachineCount({
  value,
  className,
  digitClassName,
}: SlotMachineCountProps) {
  const safeValue = Math.max(0, Math.floor(value));
  const length = Math.max(4, String(safeValue).length);
  const finalText = String(safeValue).padStart(length, "0");
  const [display, setDisplay] = useState(() => scramble(length, ""));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const startedAt = performance.now();
    const durationMs = 1100;

    setSettled(false);
    setDisplay(scramble(length, ""));

    const tick = (now: number) => {
      if (cancelled) return;

      const progress = Math.min(1, (now - startedAt) / durationMs);
      if (progress < 1) {
        const locked = Math.floor(progress * length);
        setDisplay(scramble(length, finalText.slice(0, locked)));
        raf = window.requestAnimationFrame(tick);
        return;
      }

      setDisplay(finalText);
      setSettled(true);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [finalText, length]);

  return (
    <span
      className={cn(
        "inline-flex items-end gap-1.5 text-5xl text-white sm:text-6xl lg:text-7xl",
        className,
      )}
      aria-label={`${safeValue} plus practice questions`}
    >
      {display.split("").map((digit, index) => (
        <span
          key={`${length}-${index}`}
          className={cn(
            "inline-flex h-[1.15em] w-[0.72em] items-center justify-center rounded-lg bg-[#3B82F6]/25 font-display font-bold tabular-nums leading-none",
            settled ? "opacity-100" : "opacity-90",
            digitClassName,
          )}
        >
          {digit}
        </span>
      ))}
      <span className="inline-flex h-[1.15em] w-[0.72em] items-center justify-center rounded-lg bg-[#3B82F6] font-display font-bold leading-none text-white">
        +
      </span>
    </span>
  );
}
