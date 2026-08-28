"use client";

import { DROPDOWN_COLOUR_SCHEMES } from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId } from "@/lib/pearson/types";
import { splitMnemonic } from "@/lib/pearson/shortcuts";
import { FlagIcon } from "./PearsonIcons";

interface PearsonToolbarProps {
  flagged?: boolean;
  onToggleFlag?: () => void;
  showFlag?: boolean;
  colourScheme: ColourSchemeId;
  onColourSchemeChange: (id: ColourSchemeId) => void;
  disabled?: boolean;
}

function MnemonicLabel({ label, letter }: { label: string; letter: string }) {
  const parts = splitMnemonic(label, letter);
  if (!parts) return <>{label}</>;
  return (
    <>
      {parts.before}
      <span className="mnemonic">{parts.mnemonic}</span>
      {parts.after}
    </>
  );
}

export function PearsonToolbar({
  flagged = false,
  onToggleFlag,
  showFlag = false,
  colourScheme,
  onColourSchemeChange,
  disabled = false,
}: PearsonToolbarProps) {
  const dropdownValue =
    colourScheme === "standard" ? "black-on-white" : colourScheme;

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
              <MnemonicLabel label="Flag for Review" letter="F" />
            </button>
            <span className="pearson-toolbar-divider" aria-hidden="true" />
          </>
        ) : null}
        <label className="pearson-toolbar-label">
          <span>Color Scheme</span>
          <select
            className="pearson-colour-select"
            value={dropdownValue}
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
        </label>
      </div>
    </div>
  );
}
