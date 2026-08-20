"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const CARDS = [
  { label: "ESAT sample", color: "#8B2942" },
  { label: "NSAA", color: "#8FA88A" },
  { label: "ENGAA", color: "#C9A227" },
  { label: "TMUA", color: "#9B8AA8" },
] as const;

export function HeroPaperStack({ className }: { className?: string }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 50);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn("relative mx-auto h-44 w-full max-w-xs sm:h-52 sm:max-w-sm", className)}
      aria-hidden
    >
      {CARDS.map((card, index) => (
        <div
          key={card.label}
          className={cn(
            "absolute left-1/2 top-1/2 w-[72%] rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none",
            settled ? "opacity-100" : "opacity-0",
          )}
          style={{
            backgroundColor: card.color,
            transform: settled
              ? `translate(calc(-50% + ${index * 10}px), calc(-50% + ${index * 14}px)) rotate(${index * 2 - 3}deg)`
              : `translate(calc(-50% + ${index * 24}px), calc(-50% - 40px)) rotate(${index * 6 - 8}deg)`,
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
