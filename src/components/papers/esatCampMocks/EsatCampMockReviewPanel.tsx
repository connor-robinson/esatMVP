"use client";

import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { MathContent } from "@/components/shared/MathContent";
import { StemContent } from "@/components/shared/StemContent";
import { cn } from "@/lib/utils";
import type { Letter, Question } from "@/types/papers";

/**
 * Review panel for ESAT CAMP mock editor-key fields.
 * Reuses the Question Bank distractor interaction pattern
 * ("Why it may be wrong") without changing official past-paper flow.
 */
export function EsatCampMockReviewPanel({
  question,
  userChoice,
}: {
  question: Question;
  userChoice: Letter | null;
}) {
  const [revealedDistractors, setRevealedDistractors] = useState<Set<string>>(
    () => new Set(),
  );

  const distractorEntries = useMemo(() => {
    const map = question.distractorMap ?? {};
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [question.distractorMap]);

  if (
    !question.distractorMap &&
    !question.benchmarkNote &&
    !question.tipText &&
    !question.difficultyLabel
  ) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {(question.topicCode || question.difficultyLabel || question.targetDisplay) && (
        <div className="flex flex-wrap gap-2 text-xs text-text-muted">
          {question.topicCode && question.topicName ? (
            <span className="rounded-organic-md bg-surface-mid px-2.5 py-1">
              {question.topicCode} {question.topicName}
            </span>
          ) : null}
          {question.difficultyLabel ? (
            <span className="rounded-organic-md bg-surface-mid px-2.5 py-1">
              {question.difficultyLabel}
            </span>
          ) : null}
          {question.targetDisplay ? (
            <span className="rounded-organic-md bg-surface-mid px-2.5 py-1">
              Target {question.targetDisplay}
            </span>
          ) : null}
        </div>
      )}

      {distractorEntries.length > 0 ? (
        <div className="rounded-lg bg-neutral-800 p-4">
          <div className="mb-3 text-[15px] font-semibold text-accent">
            Distractor map
          </div>
          <div className="flex flex-col gap-2">
            {distractorEntries.map(([letter, text]) => {
              const isUserWrong =
                userChoice === letter && letter !== question.answerLetter;
              const revealed = revealedDistractors.has(letter) || !isUserWrong;
              return (
                <div
                  key={letter}
                  className={cn(
                    "relative overflow-hidden rounded-organic-md bg-surface-mid/60 px-3 py-2.5",
                    isUserWrong && "bg-surface-mid",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 shrink-0 text-sm font-semibold tabular-nums">
                      {letter}
                    </span>
                    {revealed ? (
                      <StemContent
                        content={text}
                        className="min-w-0 flex-1 text-sm leading-snug text-text-muted"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedDistractors((prev) =>
                            new Set(prev).add(letter),
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full",
                          "bg-surface-elevated/95 px-3 py-1.5",
                          "text-[11px] font-medium tracking-wide text-text-muted",
                          "transition-all duration-fast ease-signature",
                          "hover:bg-surface-mid/80 hover:text-text",
                        )}
                        title="Reveal why it may be wrong"
                      >
                        <HelpCircle
                          className="h-3.5 w-3.5 shrink-0 opacity-80"
                          strokeWidth={2}
                          aria-hidden
                        />
                        Why it may be wrong
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {question.benchmarkNote ? (
        <div className="rounded-lg bg-neutral-800 p-4">
          <div className="mb-2 text-[15px] font-semibold text-accent">
            Benchmark note
          </div>
          <MathContent
            content={question.benchmarkNote}
            className="text-sm leading-relaxed text-text"
          />
        </div>
      ) : null}
    </div>
  );
}
