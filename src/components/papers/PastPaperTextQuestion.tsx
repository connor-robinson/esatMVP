"use client";

import { MathContent } from "@/components/shared/MathContent";
import { StemContent } from "@/components/shared/StemContent";
import { EsatCampMockDiagram } from "@/components/papers/esatCampMocks/diagrams";
import { cn } from "@/lib/utils";
import {
  getPastPaperOptionLetters,
  shouldRenderPastPaperAsText,
} from "@/lib/papers/pastPaperTextMode";
import {
  solveSessionTextChoiceBtn,
  solveSessionTextChoiceBtnSelected,
} from "@/lib/papers/solveSessionStyles";
import type { Letter, Question } from "@/types/papers";

interface PastPaperTextQuestionProps {
  question: Question;
  questionNumber: number;
  className?: string;
  /** When set, render selectable option rows (solve mode) */
  selectedChoice?: Letter | null;
  onChoiceSelect?: (letter: Letter) => void;
  showOptionsBelow?: boolean;
  showStem?: boolean;
}

export function PastPaperTextQuestion({
  question,
  questionNumber,
  className,
  selectedChoice,
  onChoiceSelect,
  showOptionsBelow = false,
  showStem = true,
}: PastPaperTextQuestionProps) {
  if (!shouldRenderPastPaperAsText(question) || !question.questionStem) {
    return null;
  }
  if (!showStem && !showOptionsBelow) {
    return null;
  }

  const letters = getPastPaperOptionLetters(question);
  const options = question.options ?? {};
  const stem = question.questionStem
    .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "")
    .trim();
  const stemDiagrams = (question.diagramAssets ?? []).filter(
    (asset) => !asset.option_letter && asset.role !== "graphical_option",
  );
  const optionAssets = new Map(
    (question.diagramAssets ?? [])
      .filter((asset) => Boolean(asset.option_letter))
      .map((asset) => [asset.option_letter as Letter, asset]),
  );

  return (
    <div
      className={cn(
        "w-full max-w-3xl mx-auto space-y-6 px-4 py-6",
        className,
      )}
    >
      {showStem && (
        <>
          <div className="text-sm font-semibold text-text-muted tabular-nums">
            {questionNumber}.
          </div>
          <div className="text-base leading-relaxed text-text">
            <StemContent content={stem} className="text-inherit" />
          </div>
          {question.diagramKey ? (
            <div className="flex justify-center text-text">
              <EsatCampMockDiagram diagramKey={question.diagramKey} />
            </div>
          ) : null}
          {stemDiagrams.map((asset) => (
            <div key={asset.id} className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.alt ?? "question diagram"}
                className="max-h-[32rem] max-w-full object-contain"
              />
            </div>
          ))}
        </>
      )}

      {showOptionsBelow && (
        <div className="flex flex-col gap-2.5 pt-2">
          {letters.map((letter) => {
            const text = options[letter as Letter];
            const optionAsset = optionAssets.get(letter as Letter);
            if (!text && !optionAsset) return null;
            const selected = selectedChoice === letter;
            const interactive = Boolean(onChoiceSelect);
            return (
              <button
                key={letter}
                type="button"
                disabled={!interactive}
                onClick={() => onChoiceSelect?.(letter as Letter)}
                className={cn(
                  "transition-all duration-fast",
                  interactive && "cursor-pointer",
                  selected
                    ? solveSessionTextChoiceBtnSelected
                    : interactive
                      ? solveSessionTextChoiceBtn
                      : solveSessionTextChoiceBtn,
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 shrink-0 text-sm font-semibold tabular-nums">
                    {letter}
                  </span>
                  <div className="min-w-0 flex-1 text-[0.98rem] leading-relaxed">
                    {text && (
                      <MathContent content={text} className="text-inherit" />
                    )}
                    {optionAsset && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={optionAsset.url}
                        alt={optionAsset.alt ?? `option ${letter}`}
                        className="mt-1 max-h-56 max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
