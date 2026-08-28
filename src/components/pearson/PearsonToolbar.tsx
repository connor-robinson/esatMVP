"use client";

import { COLOUR_SCHEMES } from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId } from "@/lib/pearson/types";

interface PearsonToolbarProps {
  flagged: boolean;
  onToggleFlag: () => void;
  colourScheme: ColourSchemeId;
  onColourSchemeChange: (id: ColourSchemeId) => void;
  disabled?: boolean;
}

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 1.5v11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
      {filled ? (
        <path d="M3.5 2h7L8.5 5 10.5 8H3.5V2z" fill="currentColor" />
      ) : (
        <path
          d="M3.5 2h7L8.5 5 10.5 8H3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="miter"
        />
      )}
    </svg>
  );
}

export function PearsonToolbar({
  flagged,
  onToggleFlag,
  colourScheme,
  onColourSchemeChange,
  disabled = false,
}: PearsonToolbarProps) {
  return (
    <div className="pearson-toolbar">
      <button
        type="button"
        onClick={onToggleFlag}
        disabled={disabled}
        aria-pressed={flagged}
        data-flagged={flagged ? "true" : "false"}
      >
        <FlagIcon filled={flagged} />
        <span>Flag for Review</span>
      </button>
      <label>
        <span>Color Scheme</span>
        <select
          value={colourScheme}
          disabled={disabled}
          onChange={(e) =>
            onColourSchemeChange(e.target.value as ColourSchemeId)
          }
          aria-label="Color Scheme"
        >
          {COLOUR_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
