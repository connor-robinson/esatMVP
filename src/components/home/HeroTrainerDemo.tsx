"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { StemContent } from "@/components/shared/StemContent";

type TrainerQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: [string, string];
  correctIndex: 0 | 1;
};

const QUESTIONS: TrainerQuestion[] = [
  {
    id: "arithmetic",
    topic: "Arithmetic",
    prompt: "$48 \\times 25$",
    options: ["1,200", "960"],
    correctIndex: 0,
  },
  {
    id: "complete-square",
    topic: "Complete the square",
    prompt: "Rewrite $x^2 + 6x + 2$ as $(x + a)^2 + b$. What is $a$?",
    options: ["3", "6"],
    correctIndex: 0,
  },
  {
    id: "special-triangles",
    topic: "Special triangles",
    prompt: "In a $45$-$45$-$90$ triangle, a leg is $5$. What is the hypotenuse?",
    options: ["$5\\sqrt{2}$", "$5\\sqrt{3}$"],
    correctIndex: 0,
  },
];

export function HeroTrainerDemo({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);

  const question = QUESTIONS[index];
  const progress = ((index + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  const advance = useCallback(() => {
    setPicked(null);
    setFlash(null);
    setIndex((prev) => (prev + 1) % QUESTIONS.length);
  }, []);

  useEffect(() => {
    if (picked === null) return;
    const delay = flash === "correct" ? 900 : 1100;
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [picked, flash, advance]);

  const handlePick = (optionIndex: 0 | 1) => {
    if (picked !== null) return;
    const isCorrect = optionIndex === question.correctIndex;
    setPicked(optionIndex);
    setFlash(isCorrect ? "correct" : "wrong");
  };

  return (
    <div
      className={cn(
        "w-full max-w-[26rem] justify-self-end rounded-3xl bg-white/[0.08] p-5 backdrop-blur-xl sm:p-6 lg:max-w-[28rem]",
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

      <div className="mt-5 flex flex-col items-center text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B82F6]">
          {question.topic}
        </p>

        <div className="mt-4 flex min-h-[5.5rem] items-center justify-center px-1 text-xl font-semibold leading-snug text-white sm:min-h-[6rem] sm:text-2xl">
          <StemContent content={question.prompt} className="text-inherit [&_.katex]:text-[#3B82F6]" />
        </div>

        <div className="mt-5 h-1 w-full max-w-[12rem] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(12, progress)}%` }}
          />
        </div>

        <p className="mt-2 text-[11px] font-medium tabular-nums text-[#94A3B8]">
          {index + 1} / {QUESTIONS.length}
        </p>

        <div className="mt-6 grid w-full grid-cols-2 gap-3">
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
                  "rounded-xl px-3 py-3.5 text-lg font-bold transition-all duration-200",
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
                <StemContent content={option} className="text-inherit" />
              </button>
            );
          })}
        </div>

        <p
          className={cn(
            "mt-4 h-5 text-xs font-semibold transition-opacity",
            flash === "correct" && "text-[#3B82F6] opacity-100",
            flash === "wrong" && "text-red-300 opacity-100",
            !flash && "opacity-0",
          )}
        >
          {flash === "correct"
            ? "Nice — next question"
            : flash === "wrong"
              ? "Not quite — try the next one"
              : "placeholder"}
        </p>
      </div>
    </div>
  );
}
