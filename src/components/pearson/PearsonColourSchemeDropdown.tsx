"use client";

import { useEffect, useRef, useState } from "react";
import {
  DROPDOWN_COLOUR_SCHEMES,
  getColourScheme,
} from "@/lib/pearson/colourSchemes";
import type { ColourSchemeId } from "@/lib/pearson/types";
import { ColourSchemeCaret } from "./PearsonIcons";

interface PearsonColourSchemeDropdownProps {
  value: ColourSchemeId;
  onChange: (id: ColourSchemeId) => void;
  disabled?: boolean;
}

export function PearsonColourSchemeDropdown({
  value,
  onChange,
  disabled = false,
}: PearsonColourSchemeDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const triggerLabel = getColourScheme(value).label;

  return (
    <div className="pearson-colour-dropdown" ref={rootRef}>
      <button
        type="button"
        className="pearson-colour-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Color Scheme"
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
      >
        <span className="pearson-colour-trigger-label">{triggerLabel}</span>
        <ColourSchemeCaret />
      </button>
      {open ? (
        <ul className="pearson-colour-menu" role="listbox">
          {DROPDOWN_COLOUR_SCHEMES.map((scheme) => {
            const selected = value === scheme.id;
            return (
              <li key={scheme.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={selected ? "is-active" : undefined}
                  onClick={() => {
                    onChange(scheme.id);
                    setOpen(false);
                  }}
                >
                  {scheme.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
