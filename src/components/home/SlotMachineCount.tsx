"use client";

import { useEffect, useRef, useState } from "react";
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

/** Ease-out cubic: fast start, gradual slowdown into the final value. */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function SlotMachineCount({
  value,
  className,
  digitClassName,
}: SlotMachineCountProps) {
  const safeValue = Math.max(0, Math.floor(value));
  const length = Math.max(4, String(safeValue).length);
  const finalText = String(safeValue).padStart(length, "0");
  const rootRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [display, setDisplay] = useState(() => scramble(length, ""));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || hasPlayed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasPlayed]);

  useEffect(() => {
    if (!inView || hasPlayed) return;

    let cancelled = false;
    let raf = 0;
    let timeout = 0;
    const startedAt = performance.now();
    const durationMs = 2200;
    let lastFrameAt = 0;

    setSettled(false);
    setDisplay(scramble(length, ""));

    const tick = (now: number) => {
      if (cancelled) return;

      const linear = Math.min(1, (now - startedAt) / durationMs);
      const eased = easeOutCubic(linear);

      // Frame spacing grows as we ease out - scramble slows near the end.
      const minGap = 28;
      const maxGap = 160;
      const frameGap = minGap + (maxGap - minGap) * eased;

      if (now - lastFrameAt < frameGap && linear < 1) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      lastFrameAt = now;

      if (linear < 1) {
        const locked = Math.min(length, Math.floor(eased * length));
        setDisplay(scramble(length, finalText.slice(0, locked)));
        raf = window.requestAnimationFrame(tick);
        return;
      }

      setDisplay(finalText);
      setSettled(true);
      setHasPlayed(true);
    };

    // Small delay so the section is settled before the scramble kicks off.
    timeout = window.setTimeout(() => {
      raf = window.requestAnimationFrame(tick);
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(raf);
    };
  }, [inView, hasPlayed, finalText, length]);

  return (
    <span
      ref={rootRef}
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
