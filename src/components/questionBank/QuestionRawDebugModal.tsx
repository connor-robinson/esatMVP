"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { QuestionBankQuestion } from "@/types/questionBank";
import { normalizeStemWhitespace } from "@/lib/utils/stemWhitespace";
import { renderMathContent } from "@/hooks/useKaTeX";

interface QuestionRawDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionBankQuestion;
}

function visibleRaw(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "→")
    .replace(/ /g, "·");
}

export function QuestionRawDebugModal({
  isOpen,
  onClose,
  question,
}: QuestionRawDebugModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stemNorm = normalizeStemWhitespace(question.question_stem);
  const stemHtml = renderMathContent(question.question_stem);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Question raw debug"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-organic-xl bg-surface-elevated shadow-modal-card">
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-text">Raw question debug</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-organic-md text-text-muted hover:bg-surface-mid hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-5 font-mono text-xs leading-relaxed text-text-muted">
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                question_stem (raw)
              </p>
              <pre className="whitespace-pre-wrap break-all rounded-organic-md bg-surface-mid p-3 text-text">
                {visibleRaw(question.question_stem)}
              </pre>
            </section>
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                question_stem (after normalizeStemWhitespace)
              </p>
              <pre className="whitespace-pre-wrap break-all rounded-organic-md bg-surface-mid p-3 text-text">
                {visibleRaw(stemNorm)}
              </pre>
            </section>
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                rendered HTML (stem)
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-organic-md bg-surface-mid p-3 text-text">
                {stemHtml}
              </pre>
            </section>
            {Object.entries(question.options)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, text]) => (
                <section key={letter}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-text">
                    option {letter} (raw)
                  </p>
                  <pre className="whitespace-pre-wrap break-all rounded-organic-md bg-surface-mid p-3 text-text">
                    {visibleRaw(text)}
                  </pre>
                  <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-text">
                    option {letter} (rendered HTML)
                  </p>
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-organic-md bg-surface-mid p-3 text-text">
                    {renderMathContent(text)}
                  </pre>
                </section>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
