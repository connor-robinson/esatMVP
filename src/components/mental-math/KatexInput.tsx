/**
 * Math answer input: raw strip on top, main type bar, KaTeX preview, collapsible symbol bar
 */

"use client";

import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { cn } from "@/lib/utils";
import { renderMath } from "@/hooks/useKaTeX";
import { Eye } from "lucide-react";
import { CollapsibleMathSymbolBar } from "./CollapsibleMathSymbolBar";
import { insertAtCursor, toMathDisplayFormat } from "./mathInputUtils";

interface KatexInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReveal?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showReveal?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const KatexInput = forwardRef<HTMLInputElement, KatexInputProps>(function KatexInput(
  {
    value,
    onChange,
    onSubmit,
    onReveal,
    placeholder = "Type your answer",
    disabled = false,
    showReveal = false,
    hasError = false,
    autoFocus = false,
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [renderedHtml, setRenderedHtml] = useState("");

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (!value.trim()) {
      setRenderedHtml("");
      return;
    }
    try {
      const displayValue = toMathDisplayFormat(value.trim());
      const rendered = renderMath(displayValue, false);
      setRenderedHtml(rendered ?? value);
    } catch {
      setRenderedHtml(value);
    }
  }, [value]);

  const handleInsert = useCallback(
    (insert: string, cursorOffset = 0) => {
      if (disabled) return;
      const el = inputRef.current;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? value.length;
      const { next, cursor } = insertAtCursor(value, insert, start, end, cursorOffset);
      onChange(next);
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(cursor, cursor);
      });
    },
    [disabled, onChange, value],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex w-full max-w-md flex-col gap-2">
      {/* Raw text strip */}
      {value.trim() ? (
        <div
          className="rounded-lg bg-surface-elevated px-3 py-1.5 text-center text-sm font-mono text-text-muted"
          aria-live="polite"
        >
          {value}
        </div>
      ) : null}

      {/* Main type bar — same as original simple/math input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "h-16 w-full rounded-2xl border-0 text-2xl font-semibold outline-none transition-all duration-75",
            hasError
              ? "bg-error/20 text-error focus:ring-0 focus:outline-none"
              : "bg-surface-elevated text-text focus:ring-0 focus:outline-none",
            "placeholder:text-base placeholder:font-medium placeholder:text-text-disabled",
            disabled && "cursor-not-allowed opacity-50",
          )}
          style={{
            textAlign: "center",
            paddingLeft: "4.5rem",
            paddingRight: "4.5rem",
            lineHeight: "4rem",
            height: "4rem",
          }}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {showReveal && onReveal && (
            <button
              type="button"
              onClick={onReveal}
              className="rounded-xl bg-surface-elevated p-2 text-text-muted transition-all hover:bg-surface hover:text-text"
              title="Reveal answer"
            >
              <Eye className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={(!value.trim() && !showReveal) || disabled}
            className={cn(
              "rounded-xl p-3 transition-all",
              hasError
                ? "bg-error/20 text-error hover:bg-error/30"
                : value.trim() && !disabled
                  ? "bg-primary/20 text-primary hover:scale-110 hover:bg-primary/30"
                  : "cursor-not-allowed bg-surface-elevated text-text-disabled",
            )}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* KaTeX preview — between type bar and symbol bar */}
      <div
        className={cn(
          "flex min-h-[2.75rem] items-center justify-center rounded-xl px-3 py-2",
          hasError ? "bg-error/10" : "bg-surface-elevated/60",
        )}
        aria-hidden={!renderedHtml}
      >
        {renderedHtml ? (
          <div
            className={cn(
              "max-w-full overflow-x-auto text-xl [&_.katex]:text-[1.15rem]",
              hasError ? "text-error" : "text-text",
            )}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <span className="text-sm font-medium text-text-disabled">Preview</span>
        )}
      </div>

      {/* Collapsible symbol bar */}
      <CollapsibleMathSymbolBar onInsert={handleInsert} disabled={disabled} />
    </div>
  );
});
