"use client";

import { StemContent } from "@/components/shared/StemContent";
import { PearsonRadioGroup } from "@/components/pearson/PearsonRadioGroup";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";
import { shouldUseLetterOnlyOptions } from "@/lib/papers/tableBackedOptions";
import type { Letter, Question } from "@/types/papers";

interface PearsonRichQuestionProps {
  question: Question;
  selected: Letter | null;
  onSelect: (letter: Letter) => void;
  disabled?: boolean;
}

function hasTextStem(question: Question): boolean {
  return Boolean(question.questionStem?.trim());
}

function useImageFallback(question: Question): boolean {
  if (question.contentFormat === "image") return true;
  if (!hasTextStem(question)) return true;
  return false;
}

/**
 * Renders stem + options via StemContent, or whole-question image when
 * contentFormat is image / no stem is available.
 */
export function PearsonRichQuestion({
  question,
  selected,
  onSelect,
  disabled = false,
}: PearsonRichQuestionProps) {
  if (useImageFallback(question)) {
    return (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={question.questionImage}
          alt={`Question ${question.questionNumber}`}
          className="pearson-stem-img"
        />
        {/* Image items may still expose letter options if present. */}
        {question.options && Object.keys(question.options).length > 0 ? (
          <PearsonRadioGroup
            name={`q-${question.id}`}
            value={selected}
            onChange={onSelect}
            disabled={disabled}
            options={getPastPaperOptionLetters(question).map((letter) => {
              const L = letter as Letter;
              const text = question.options?.[L];
              const letterOnly = shouldUseLetterOnlyOptions(question);
              return {
                letter: L,
                content:
                  letterOnly && text ? (
                    <span>{L}</span>
                  ) : text ? (
                    <StemContent content={text} className="text-inherit inline" />
                  ) : (
                    <span>{L}</span>
                  ),
              };
            })}
          />
        ) : null}
      </div>
    );
  }

  const useInlineStem = /<figure\b[^>]*class="[^"]*qg-diagram/i.test(
    question.questionStem ?? "",
  );
  const stem = useInlineStem
    ? (question.questionStem ?? "").trim()
    : (question.questionStem ?? "")
        .replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, "")
        .trim();
  const stemDiagrams = useInlineStem
    ? []
    : (question.diagramAssets ?? []).filter(
        (asset) => !asset.option_letter && asset.role !== "graphical_option",
      );
  const optionAssets = new Map(
    (question.diagramAssets ?? [])
      .filter((asset) => Boolean(asset.option_letter))
      .map((asset) => [asset.option_letter as Letter, asset]),
  );
  const letters = getPastPaperOptionLetters(question);
  const options = question.options ?? {};
  const letterOnlyOptions = shouldUseLetterOnlyOptions(question);

  const renderOptionContent = (
    letter: Letter,
    text: string | undefined,
    optionAsset?: { url: string; alt?: string; display_width_pct?: number },
  ) => {
    // Graphical options: image only (never placeholder text like "Graph A").
    if (optionAsset) {
      const widthPct = optionAsset.display_width_pct;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={optionAsset.url}
          alt={optionAsset.alt ?? `option ${letter}`}
          className="pearson-option-img"
          style={
            typeof widthPct === "number" && widthPct > 0
              ? { width: `${Math.min(widthPct, 42)}%` }
              : undefined
          }
        />
      );
    }
    if (letterOnlyOptions) {
      return <span>{letter}</span>;
    }
    if (text) {
      return <StemContent content={text} className="text-inherit inline" />;
    }
    return <span>{letter}</span>;
  };

  return (
    <div>
      <div className="pearson-stem">
        <StemContent content={stem} className="text-inherit" />
      </div>
      {stemDiagrams.map((asset) => (
        <div key={asset.id} className="pearson-diagram">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.url}
            alt={asset.alt ?? "question diagram"}
          />
        </div>
      ))}
      <PearsonRadioGroup
        name={`q-${question.id}`}
        value={selected}
        onChange={onSelect}
        disabled={disabled}
        options={letters
          .map((letter) => {
            const L = letter as Letter;
            const text = options[L];
            const optionAsset = optionAssets.get(L);
            if (!text && !optionAsset) return null;
            return {
              letter: L,
              content: renderOptionContent(L, text, optionAsset),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)}
      />
    </div>
  );
}
