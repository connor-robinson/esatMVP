"use client";

import { useState } from "react";
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
import { isEsatCampMockExamType } from "@/lib/papers/esatCampMocks";
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

const PANEL_SHELL = "rounded-organic-xl bg-surface-elevated";
const OPTION_ROW_BASE = "bg-surface-subtle dark:bg-surface-mid";
const OPTION_ROW_SELECTED = "bg-surface-mid dark:bg-folder-card-selected";
const OPTION_ROW_HOVER =
  "hover:bg-surface-mid/70 dark:hover:bg-surface-neutral";

/**
 * Text past-paper renderer.
 * ESAT CAMP mocks use Question Bank-style panels (text, not paper images).
 */
export function PastPaperTextQuestion({
  question,
  questionNumber,
  className,
  selectedChoice,
  onChoiceSelect,
  showOptionsBelow = false,
  showStem = true,
}: PastPaperTextQuestionProps) {
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  if (!shouldRenderPastPaperAsText(question) || !question.questionStem) {
    return null;
  }
  if (!showStem && !showOptionsBelow) {
    return null;
  }

  const useQuestionBankLayout = isEsatCampMockExamType(question.examType);
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

  if (useQuestionBankLayout) {
    return (
      <div className={cn("w-full space-y-5", className)}>
        {showStem ? (
          <div
            className={cn(
              PANEL_SHELL,
              "px-5 pb-8 pt-5 sm:px-8 sm:pt-6 sm:pb-10",
            )}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums text-text-muted">
                {questionNumber}.
              </span>
            </div>
            <div
              className={cn(
                "inline-block w-full font-sans text-[1.05rem] leading-relaxed tracking-tight text-text sm:text-[1.125rem]",
              )}
            >
              <StemContent content={stem} className="text-inherit inline" />
            </div>
            {question.diagramKey ? (
              <div className="mt-6 flex justify-center text-text">
                <EsatCampMockDiagram diagramKey={question.diagramKey} />
              </div>
            ) : null}
            {stemDiagrams.map((asset) => (
              <div key={asset.id} className="mt-6 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.alt ?? "question diagram"}
                  className="max-h-[32rem] max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        ) : null}

        {showOptionsBelow ? (
          <div className={cn(PANEL_SHELL, "p-4 sm:p-5")}>
            <div className="flex flex-col gap-2.5">
              {letters.map((letter) => {
                const text = options[letter as Letter];
                const optionAsset = optionAssets.get(letter as Letter);
                if (!text && !optionAsset) return null;
                const selected = selectedChoice === letter;
                const interactive = Boolean(onChoiceSelect);
                return (
                  <div
                    key={letter}
                    className={cn(
                      "relative flex w-full flex-col overflow-hidden rounded-organic-md transition-[background-color,opacity] duration-fast ease-signature",
                      selected ? OPTION_ROW_SELECTED : OPTION_ROW_BASE,
                      interactive && !selected && OPTION_ROW_HOVER,
                      interactive ? "cursor-pointer" : "cursor-default",
                      hoveredOption === letter &&
                        interactive &&
                        !selected &&
                        "bg-surface-mid/70 dark:bg-surface-neutral",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => onChoiceSelect?.(letter as Letter)}
                      onMouseEnter={() =>
                        interactive && setHoveredOption(letter)
                      }
                      onMouseLeave={() => setHoveredOption(null)}
                      className="relative flex w-full items-center gap-2 px-3.5 py-2.5 text-left sm:gap-3 sm:px-4 sm:py-3"
                    >
                      <span
                        className={cn(
                          "flex w-6 shrink-0 items-center text-sm font-semibold tabular-nums leading-none",
                          selected ? "text-text" : "text-text-muted",
                        )}
                      >
                        {letter}
                      </span>
                      <div className="flex min-w-0 flex-1 items-center font-sans text-[0.98rem] leading-relaxed tracking-tight text-text sm:text-[1.02rem]">
                        {text ? (
                          <StemContent
                            content={text}
                            className="text-inherit inline"
                          />
                        ) : null}
                        {optionAsset ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={optionAsset.url}
                            alt={optionAsset.alt ?? `option ${letter}`}
                            className="mt-1 max-h-56 max-w-full object-contain"
                          />
                        ) : null}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl space-y-6 px-4 py-6",
        className,
      )}
    >
      {showStem && (
        <>
          <div className="text-sm font-semibold tabular-nums text-text-muted">
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
