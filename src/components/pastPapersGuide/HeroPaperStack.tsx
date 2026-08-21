"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CARDS = [
  { label: "ESAT sample", fillClass: "bg-maths" },
  { label: "NSAA", fillClass: "bg-accent" },
  { label: "ENGAA", fillClass: "bg-advanced" },
  { label: "TMUA", fillClass: "bg-tmua-accent" },
] as const;

export function HeroPaperStack({ className }: { className?: string }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "relative mx-auto h-56 w-full max-w-xs sm:h-64 sm:max-w-sm",
        className,
      )}
      aria-hidden
    >
      {CARDS.map((card, index) => (
        <div
          key={card.label}
          className={cn(
            "absolute left-1/2 top-[42%] w-[70%] rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/40 transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none",
            card.fillClass,
            settled ? "opacity-100" : "opacity-0",
          )}
          style={{
            // Fan cards so each prior title peeks above/left of the next.
            transform: settled
              ? `translate(calc(-50% + ${index * 18}px), calc(-50% + ${index * 28}px)) rotate(${index * 2.5 - 4}deg)`
              : `translate(calc(-50% + ${index * 28}px), calc(-50% - 48px)) rotate(${index * 6 - 8}deg)`,
            zIndex: index + 1,
            transitionDelay: `${index * 80}ms`,
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-80">
            Paper
          </span>
          <p className="mt-1 font-display text-base">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
