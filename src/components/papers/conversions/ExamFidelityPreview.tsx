"use client";

import { MathContent } from "@/components/shared/MathContent";
import { StemContent } from "@/components/shared/StemContent";
import { cn } from "@/lib/utils";
import { buildPreviewQuestion } from "@/types/conversions";
import type { ConversionPreviewRow } from "@/types/conversions";
import type { Letter } from "@/types/papers";

interface ExamFidelityPreviewProps {
  row: ConversionPreviewRow;
  className?: string;
}

function getOptionLetters(row: ConversionPreviewRow): string[] {
  if (row.optionLetters?.length) return [...row.optionLetters].sort();
  if (row.options) return Object.keys(row.options).sort();
  return [];
}

export function ExamFidelityPreview({ row, className }: ExamFidelityPreviewProps) {
  const question = buildPreviewQuestion(row);
  const letters = getOptionLetters(row);
  const options = row.options ?? {};
  const stemDiagrams = (row.diagramAssets ?? []).filter(
    (asset) => !asset.option_letter && asset.role !== "graphical_option",
  );
  const optionAssets = new Map(
    (row.diagramAssets ?? [])
      .filter((asset) => Boolean(asset.option_letter))
      .map((asset) => [asset.option_letter, asset]),
  );
  const qNum = row.detectedQuestionNumber ?? row.questionNumber;
  const twoCol = letters.length >= 6;

  return (
    <div
      className={cn(
        "exam-fidelity-preview h-full w-full overflow-y-auto bg-white text-[#111111]",
        className,
      )}
      style={{
        fontFamily: '"Times New Roman", Georgia, "DejaVu Serif", serif',
        fontSize: "clamp(11px, 1.35vw, 14px)",
        lineHeight: 1.45,
      }}
    >
      <div className="flex min-h-full flex-col px-[6%] py-[5%]">
        <div className="mb-[0.6em] font-bold tabular-nums">{qNum}.</div>

        {question.questionStem && (
          <div className="exam-fidelity-stem mb-[0.8em]">
            <StemContent content={question.questionStem} className="text-inherit" />
          </div>
        )}

        {stemDiagrams.map((diagram) => (
          <div
            key={diagram.id}
            className="mb-[0.8em] flex justify-center"
            style={
              diagram.bbox_norm
                ? {
                    marginTop: `${diagram.bbox_norm[1] * 8}%`,
                    width: `${Math.min(diagram.bbox_norm[2] * 100, 92)}%`,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }
                : undefined
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={diagram.url}
              alt={diagram.alt ?? "diagram"}
              className="max-h-[38%] max-w-full object-contain"
            />
          </div>
        ))}

        {letters.length > 0 && (
          <div
            className={cn(
              "mt-auto gap-x-[6%] gap-y-[0.35em]",
              twoCol ? "grid grid-cols-2" : "flex flex-col",
            )}
          >
            {letters.map((letter) => {
              const text = options[letter as Letter];
              const optionAsset = optionAssets.get(letter as Letter);
              if (!text && !optionAsset) return null;
              return (
                <div key={letter} className="flex items-start gap-[0.4em]">
                  <span className="shrink-0 font-normal tabular-nums">{letter}</span>
                  <div className="min-w-0 flex-1">
                    {text && <MathContent content={text} className="text-inherit" />}
                    {optionAsset && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={optionAsset.url}
                        alt={optionAsset.alt ?? `option ${letter}`}
                        className="mt-1 max-h-40 max-w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!question.questionStem && letters.length === 0 && (
          <p className="text-[#666] italic">No text extracted</p>
        )}
      </div>

      <style jsx global>{`
        .exam-fidelity-preview .math-content,
        .exam-fidelity-preview .math-content .katex {
          color: #111111 !important;
        }
        .exam-fidelity-preview .math-content .katex-display {
          margin: 0.5em 0;
        }
      `}</style>
    </div>
  );
}
