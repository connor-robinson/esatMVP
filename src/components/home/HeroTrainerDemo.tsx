"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type TrainerQuestion = {
  id: string;
  topic: string;
  prompt: ReactNode;
  options: [string, string];
  correctIndex: 0 | 1;
  showTriangle?: boolean;
};

function HeroTriangleSvg({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="55 24 130 138"
      role="img"
      aria-label="45-45-90 right triangle with base length 5 and unknown hypotenuse"
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-auto w-full text-white", className)}
    >
      {/* Triangle */}
      <path
        d="M 68 34 L 68 132 L 166 132 Z"
        fill="rgba(59, 130, 246, 0.045)"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.92"
      />

      {/* Right-angle marker */}
      <path
        d="M 68 114 L 86 114 L 86 132"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.9"
      />

      {/* Top-left angle arc */}
      <path
        d="M 68 61 A 27 27 0 0 0 87.1 53.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.9"
      />

      {/* Bottom-right angle arc */}
      <path
        d="M 139 132 A 27 27 0 0 1 146.9 112.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.9"
      />

      {/* Angle labels - inside the triangle, clear of the arcs */}
      <text
        x="94"
        y="72"
        textAnchor="middle"
        fill="currentColor"
        className="font-sans text-[10px] font-medium tracking-tight"
        opacity="0.9"
      >
        45°
      </text>
      <text
        x="134"
        y="116"
        textAnchor="middle"
        fill="currentColor"
        className="font-sans text-[10px] font-medium tracking-tight"
        opacity="0.9"
      >
        45°
      </text>

      {/* Hypotenuse unknown */}
      <text
        x="132"
        y="76"
        textAnchor="middle"
        fill="currentColor"
        className="font-sans text-[11px] font-medium"
        opacity="0.92"
      >
        ?
      </text>

      {/* Base label */}
      <text
        x="117"
        y="152"
        textAnchor="middle"
        fill="currentColor"
        className="font-sans text-[11px] font-medium"
        opacity="0.9"
      >
        5
      </text>
    </svg>
  );
}

const QUESTIONS: TrainerQuestion[] = [
  {
    id: "arithmetic",
    topic: "Arithmetic",
    prompt: (
      <span className="font-mono text-3xl font-medium text-[#3B82F6] sm:text-4xl">
        48 × 25
      </span>
    ),
    options: ["1,200", "960"],
    correctIndex: 0,
  },
  {
    id: "complete-square",
    topic: "Complete the square",
    prompt: (
      <span className="flex flex-col items-center gap-2 font-mono text-xl font-medium leading-snug tracking-tight sm:text-2xl">
        <span className="whitespace-nowrap tracking-tighter text-[#3B82F6]">
          {"x²\u2009+\u20096x\u2009+\u20092\u2009→\u2009(x\u2009+\u2009a)²\u2009+\u2009b"}
        </span>
        <span className="whitespace-nowrap tracking-normal text-white">
          What is <span className="text-[#3B82F6]">a</span>?
        </span>
      </span>
    ),
    options: ["3", "6"],
    correctIndex: 0,
  },
  {
    id: "special-triangles",
    topic: "Special triangles",
    prompt: (
      <span className="whitespace-nowrap font-sans text-lg font-medium sm:text-xl">
        <span className="text-white">Find the </span>
        <span className="text-[#3B82F6]">hypotenuse</span>
      </span>
    ),
    options: ["5√2", "5√3"],
    correctIndex: 0,
    showTriangle: true,
  },
];

export function HeroTrainerDemo({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[index];
  const progress = finished
    ? 100
    : ((index + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const advance = useCallback(() => {
    setPicked(null);
    setFlash(null);
    setIndex((prev) => {
      if (prev >= QUESTIONS.length - 1) {
        setFinished(true);
        return prev;
      }
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    if (picked === null || finished) return;
    const delay = flash === "correct" ? 900 : 1100;
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [picked, flash, advance, finished]);

  const handlePick = (optionIndex: 0 | 1) => {
    if (picked !== null || finished) return;
    const isCorrect = optionIndex === question.correctIndex;
    setPicked(optionIndex);
    setFlash(isCorrect ? "correct" : "wrong");
  };

  const handleReplay = () => {
    setFinished(false);
    setIndex(0);
    setPicked(null);
    setFlash(null);
  };

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[26rem] flex-col justify-self-end overflow-hidden rounded-3xl bg-white/[0.08] p-7 backdrop-blur-xl sm:max-w-[28rem] sm:p-9 lg:min-h-[34rem] lg:p-10",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500/50" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
          <div className="h-3 w-3 rounded-full bg-green-500/50" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
          Mental Maths Trainer
        </div>
      </div>

      {finished ? (
        <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center sm:mt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
            Demo complete
          </p>
          <h3 className="mt-5 max-w-xs text-2xl font-display font-bold leading-snug text-white sm:text-3xl">
            Nice work. There&apos;s a lot more where that came from
          </h3>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Sign up free to unlock every practice mode, track your speed, and
            keep training across topics.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Link
              href="/login?mode=signup&redirectTo=%2Fmental-maths%2Fdrill"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#3B82F6] px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#2563EB]"
            >
              Sign up to try more modes
            </Link>
            <button
              type="button"
              onClick={handleReplay}
              className="inline-flex w-full items-center justify-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/15"
            >
              Replay demo
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center sm:mt-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
            {question.topic}
          </p>

          <div className="mt-3 flex h-[14rem] w-full flex-col items-center justify-center gap-0.5 px-1 sm:mt-4 sm:h-[14.5rem]">
            {question.showTriangle ? (
              <HeroTriangleSvg className="max-h-[10rem] w-full max-w-[13.5rem] sm:max-h-[10.5rem]" />
            ) : null}
            {question.prompt}
          </div>

          <div className="mt-5 grid w-full grid-cols-2 gap-4 sm:mt-6">
            {question.options.map((option, optionIndex) => {
              const selected = picked === optionIndex;
              const isCorrectOption = optionIndex === question.correctIndex;
              const showCorrect = picked !== null && isCorrectOption;
              const showWrong = selected && flash === "wrong";

              return (
                <button
                  key={`${question.id}-${option}`}
                  type="button"
                  onClick={() => handlePick(optionIndex as 0 | 1)}
                  disabled={picked !== null}
                  className={cn(
                    "rounded-xl px-4 py-5 font-mono text-xl font-bold transition-all duration-200 sm:py-6 sm:text-2xl",
                    picked === null &&
                      "bg-white/5 text-white hover:bg-white/10 active:scale-[0.98]",
                    showCorrect && "bg-[#3B82F6] text-white",
                    showWrong && "bg-red-500/25 text-red-200",
                    picked !== null &&
                      !showCorrect &&
                      !showWrong &&
                      "bg-white/5 text-white/40",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-7 h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(12, progress)}%` }}
            />
          </div>

          <p className="mt-3 text-xs font-medium tabular-nums text-[#94A3B8]">
            {index + 1} / {QUESTIONS.length}
          </p>

          <p
            className={cn(
              "mt-3 h-5 text-xs font-semibold transition-opacity",
              flash === "correct" && "text-[#3B82F6] opacity-100",
              flash === "wrong" && "text-red-300 opacity-100",
              !flash && "opacity-0",
            )}
          >
            {flash === "correct"
              ? "Nice. Next question"
              : flash === "wrong"
                ? "Not quite. Try the next one"
                : "placeholder"}
          </p>
        </div>
      )}
    </div>
  );
}
