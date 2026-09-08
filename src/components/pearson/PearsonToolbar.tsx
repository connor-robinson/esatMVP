"use client";

import type { PointerEvent } from "react";
import type { ColourSchemeId } from "@/lib/pearson/types";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";
import { FlagIcon } from "./PearsonIcons";
import { PearsonColourSchemeDropdown } from "./PearsonColourSchemeDropdown";

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
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return;
    const next = event.currentTarget.getAttribute("aria-pressed") !== "true";
    event.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setAttribute("aria-pressed", flagged ? "true" : "false");
  };

  return (
    <div className="pearson-toolbar-bar">
      <div className="pearson-toolbar-inner">
        {showFlag ? (
          <>
            <button
              type="button"
              className="pearson-toolbar-btn"
              onPointerDown={handlePointerDown}
              onPointerCancel={handlePointerCancel}
              onClick={onToggleFlag}
              disabled={disabled}
              aria-pressed={flagged}
            >
              <FlagIcon />
              <PearsonMnemonicLabel label="Flag for Review" letter="F" />
            </button>
            <span className="pearson-toolbar-divider" aria-hidden="true" />
          </>
        ) : null}
        <PearsonColourSchemeDropdown
          value={colourScheme}
          onChange={onColourSchemeChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
