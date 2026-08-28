"use client";

import { StemContent } from "@/components/shared/StemContent";
import { PearsonRadioGroup } from "@/components/pearson/PearsonRadioGroup";
import { getPastPaperOptionLetters } from "@/lib/papers/pastPaperTextMode";
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
            options={getPastPaperOptionLetters(question).map((letter) => ({
              letter: letter as Letter,
              content: question.options?.[letter as Letter] ? (
                <StemContent
                  content={question.options[letter as Letter]}
                  className="text-inherit inline"
                />
              ) : (
                <span>{letter}</span>
              ),
            }))}
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
              content: (
                <>
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
                      alt={optionAsset.alt ?? `option ${L}`}
                      className="pearson-stem-img"
                    />
                  ) : null}
                </>
              ),
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)}
      />
    </div>
  );
}
