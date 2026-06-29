/**
 * Math answer input: symbol bar, raw text field on top, rendered KaTeX in the main bar
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
import { MathSymbolBar } from "./MathSymbolBar";
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
  const rawInputRef = useRef<HTMLInputElement>(null);
  const [renderedHtml, setRenderedHtml] = useState("");

  useImperativeHandle(ref, () => rawInputRef.current as HTMLInputElement);

  useEffect(() => {
    if (autoFocus && rawInputRef.current && !disabled) {
      rawInputRef.current.focus();
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
      const el = rawInputRef.current;
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

  const focusRaw = () => {
    if (!disabled) rawInputRef.current?.focus();
  };

  return (
    <div className="relative flex w-full max-w-md flex-col gap-2">
      <MathSymbolBar onInsert={handleInsert} disabled={disabled} />

      <input
        ref={rawInputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          "w-full rounded-xl bg-transparent px-3 py-1 text-center text-sm font-mono text-text-muted outline-none",
          "placeholder:text-text-disabled placeholder:font-sans",
          disabled && "cursor-not-allowed opacity-50",
        )}
      />

      <div className="relative">
        <div
          role="textbox"
          tabIndex={disabled ? -1 : 0}
          onClick={focusRaw}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !disabled) {
              e.preventDefault();
              onSubmit();
            } else {
              focusRaw();
            }
          }}
          className={cn(
            "flex h-16 w-full items-center justify-center rounded-2xl px-14 transition-all duration-75",
            hasError ? "bg-error/20" : "bg-surface-elevated",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-text",
          )}
        >
          {renderedHtml ? (
            <div
              className={cn(
                "max-w-full overflow-x-auto text-2xl [&_.katex]:text-[1.35rem]",
                hasError ? "text-error" : "text-text",
              )}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <span className="text-base font-medium text-text-disabled">Preview</span>
          )}
        </div>

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
                  : "bg-surface-elevated text-text-disabled cursor-not-allowed",
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
    </div>
  );
});
