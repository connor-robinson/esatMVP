"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TriangleDiagram } from "@/components/shared/TriangleDiagram";
import { generateTriangleDiagram } from "@/lib/diagrams/triangleGenerator";

type TrainerQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: [string, string];
  correctIndex: 0 | 1;
  showTriangleDiagram?: boolean;
};

const QUESTIONS: TrainerQuestion[] = [
  {
    id: "arithmetic",
    topic: "Arithmetic",
    prompt: "48 × 25",
    options: ["1,200", "960"],
    correctIndex: 0,
  },
  {
    id: "complete-square",
    topic: "Complete the square",
    prompt: "x² + 6x + 2 → (x + a)² + b\nWhat is a?",
    options: ["3", "6"],
    correctIndex: 0,
  },
  {
    id: "special-triangles",
    topic: "Special triangles",
    prompt: "Find the hypotenuse",
    options: ["5√2", "5√3"],
    correctIndex: 0,
    showTriangleDiagram: true,
  },
];

const SPECIAL_TRIANGLE_DIAGRAM = generateTriangleDiagram({
  type: "45-45-90",
  unit: 5,
  problemType: "side",
  givenSide: "leg",
  unknownSide: "hyp",
});

export function HeroTrainerDemo({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[index];
  const progress = finished
    ? 100
    : ((index + (picked !== null ? 1 : 0)) / QUESTIONS.length) * 100;
  const triangleDiagram = useMemo(
    () =>
      !finished && question.showTriangleDiagram
        ? SPECIAL_TRIANGLE_DIAGRAM
        : null,
    [finished, question.showTriangleDiagram],
  );

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
            Nice work — there&apos;s a lot more where that came from
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

          <div
            className={cn(
              "mt-6 flex w-full flex-col items-center justify-center px-2 sm:mt-8",
              triangleDiagram
                ? "min-h-[13rem] gap-4 sm:min-h-[14rem]"
                : "min-h-[7.5rem] sm:min-h-[8.5rem]",
            )}
          >
            {triangleDiagram ? (
              <div className="w-full max-w-[13.5rem] rounded-2xl bg-white/[0.04] px-3 py-2">
                <TriangleDiagram
                  data={triangleDiagram}
                  className="[&_svg]:max-w-[180px] [&_text]:fill-white"
                />
              </div>
            ) : null}
            <p className="whitespace-pre-line font-mono text-2xl font-medium leading-snug text-[#3B82F6] sm:text-3xl">
              {question.prompt}
            </p>
          </div>

          <div className="mt-8 h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-white/10 sm:mt-10">
            <div
              className="h-full rounded-full bg-[#3B82F6] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(12, progress)}%` }}
            />
          </div>

          <p className="mt-3 text-xs font-medium tabular-nums text-[#94A3B8]">
            {index + 1} / {QUESTIONS.length}
          </p>

          <div className="mt-8 grid w-full grid-cols-2 gap-4 sm:mt-10">
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

          <p
            className={cn(
              "mt-6 h-5 text-xs font-semibold transition-opacity",
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
      )}
    </div>
  );
}
