"use client";

import { DROPDOWN_COLOUR_SCHEMES } from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId } from "@/lib/pearson/types";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";
import { FlagIcon } from "./PearsonIcons";

interface PearsonToolbarProps {
  flagged?: boolean;
  onToggleFlag?: () => void;
  showFlag?: boolean;
  colourScheme: ColourSchemeId;
  onColourSchemeChange: (id: ColourSchemeId) => void;
  disabled?: boolean;
}

export function PearsonToolbar({
  flagged = false,
  onToggleFlag,
  showFlag = false,
  colourScheme,
  onColourSchemeChange,
  disabled = false,
}: PearsonToolbarProps) {
  return (
    <div className="pearson-toolbar-bar">
      <div className="pearson-toolbar-inner">
        {showFlag ? (
          <>
            <button
              type="button"
              className="pearson-toolbar-btn"
              onClick={onToggleFlag}
              disabled={disabled}
              aria-pressed={flagged}
            >
              <FlagIcon filled={flagged} />
              <PearsonMnemonicLabel label="Flag for Review" letter="F" />
            </button>
            <span className="pearson-toolbar-divider" aria-hidden="true" />
          </>
        ) : null}
        <select
          className="pearson-colour-select"
          value={colourScheme}
          disabled={disabled}
          onChange={(e) =>
            onColourSchemeChange(e.target.value as ColourSchemeId)
          }
          aria-label="Color Scheme"
        >
          {DROPDOWN_COLOUR_SCHEMES.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
