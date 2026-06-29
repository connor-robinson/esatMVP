/**
 * Math answer input: compact raw strip on top, KaTeX preview inside main bar, collapsible symbols
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
      setRenderedHtml("");
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

  const focusInput = () => {
    if (!disabled) inputRef.current?.focus();
  };

  return (
    <div className="relative flex w-full max-w-md flex-col gap-1.5">
      {/* Compact raw source — grows with content */}
      {value ? (
        <div
          className="max-h-20 overflow-y-auto rounded-md bg-surface-elevated/80 px-2 py-0.5 text-center text-[11px] leading-snug font-mono text-text-muted/80"
          aria-live="polite"
        >
          <span className="whitespace-pre-wrap break-all">{value}</span>
        </div>
      ) : null}

      {/* Main bar: KaTeX preview underneath, transparent input on top */}
      <div className="relative">
        <div
          role="presentation"
          onClick={focusInput}
          className={cn(
            "flex h-16 w-full cursor-text items-center justify-center rounded-2xl px-14 transition-all duration-75",
            hasError ? "bg-error/20" : "bg-surface-elevated",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {renderedHtml ? (
            <div
              className={cn(
                "pointer-events-none max-w-full overflow-x-auto text-2xl [&_.katex]:text-[1.35rem]",
                hasError ? "text-error" : "text-text",
              )}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <span className="pointer-events-none text-base font-medium text-text-disabled">
              {placeholder}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          aria-label={placeholder}
          className={cn(
            "absolute inset-0 h-16 w-full rounded-2xl border-0 bg-transparent text-center text-2xl font-semibold text-transparent outline-none",
            "caret-text focus:ring-0 focus:outline-none",
            disabled && "cursor-not-allowed",
          )}
          style={{
            paddingLeft: "4.5rem",
            paddingRight: "4.5rem",
            lineHeight: "4rem",
            caretColor: hasError ? "var(--color-error)" : "var(--color-text)",
          }}
        />

        <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {showReveal && onReveal && (
            <button
              type="button"
              onClick={onReveal}
              className="pointer-events-auto rounded-xl bg-surface-elevated p-2 text-text-muted transition-all hover:bg-surface hover:text-text"
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
              "pointer-events-auto rounded-xl p-3 transition-all",
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

      <CollapsibleMathSymbolBar onInsert={handleInsert} disabled={disabled} />
    </div>
  );
});
