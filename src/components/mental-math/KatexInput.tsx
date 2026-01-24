/**
 * KaTeX-based input component for mathematical expressions
 */

"use client";

import { useState, useRef, useEffect, KeyboardEvent, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";
import { renderMath } from "@/hooks/useKaTeX";
import { Eye } from "lucide-react";
import { normalizeSuperscripts, normalizeGreekLetters } from "@/lib/answer-checker/utils";

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

export const KatexInput = forwardRef<HTMLInputElement, KatexInputProps>(function KatexInput({
  value,
  onChange,
  onSubmit,
  onReveal,
  placeholder = "Enter answer",
  disabled = false,
  showReveal = false,
  hasError = false,
  autoFocus = false,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Expose the input ref to parent
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
  
  // Auto-focus when requested
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  /**
   * Transform user input to support superscripts, fractions, and Greek letters
   */
  const transformInput = (input: string): string => {
    let transformed = input;
    
    // Convert ^2 to ², ^3 to ³, etc. (but preserve in actual value for easier editing)
    // We'll show the superscript in preview but keep caret notation in input
    return transformed;
  };

  /**
   * Convert input to display format for KaTeX rendering
   */
  const toDisplayFormat = (input: string): string => {
    if (!input.trim()) return "";
    
    let display = input;
    
    // Convert superscripts: ^2 → ², ^(-3) → ⁻³, etc.
    display = normalizeSuperscripts(display);
    
    // Convert Greek letters: theta → θ, pi → π, etc.
    display = normalizeGreekLetters(display);
    
    // Handle fractions: 3/5 → \frac{3}{5} for KaTeX
    display = display.replace(/(\d+)\s*\/\s*(\d+)/g, (_, num, den) => {
      return `\\frac{${num}}{${den}}`;
    });
    
    return display;
  };

  // Update preview when value changes
  useEffect(() => {
    if (!value.trim()) {
      setPreviewHtml("");
      return;
    }

    try {
      // Convert to display format
      const displayValue = toDisplayFormat(value.trim());
      
      // Try to render as inline math
      const rendered = renderMath(displayValue, false);
      if (rendered) {
        setPreviewHtml(rendered);
      } else {
        // Fallback: show raw value
        setPreviewHtml(value);
      }
    } catch {
      // On error, show raw value
      setPreviewHtml(value);
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Preview display */}
      {previewHtml && (
        <div
          ref={previewRef}
          className="absolute bottom-full mb-2 left-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-16 text-2xl font-semibold rounded-2xl border-0 outline-none transition-all duration-75",
            hasError
              ? "bg-red-500/20 text-red-100 focus:ring-0 focus:outline-none"
              : "bg-white/5 text-white/90 focus:ring-0 focus:outline-none",
            "placeholder:text-white/20 placeholder:text-base placeholder:font-medium",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            textAlign: "center",
            paddingLeft: "4.5rem", // Equal padding to center text properly
            paddingRight: "4.5rem", // Equal padding (button is absolutely positioned)
            lineHeight: "4rem", // Match height for vertical centering
            height: "4rem"
          }}
          autoComplete="off"
        />

        {/* Action buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showReveal && onReveal && (
            <button
              onClick={onReveal}
              className="p-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90 transition-all"
              title="Reveal answer"
            >
              <Eye className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={(!value.trim() && !showReveal) || disabled}
            className={cn(
              "p-3 rounded-xl transition-all",
              hasError
                ? "bg-red-500/20 text-red-100 hover:bg-red-500/30"
                : value.trim() && !disabled
                ? "bg-primary/20 text-primary hover:bg-primary/30 hover:scale-110"
                : "bg-white/5 text-white/20 cursor-not-allowed"
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

