"use client";

import type { ReactNode } from "react";
import type { Letter } from "@/types/papers";
import { cn } from "@/lib/utils";

export interface PearsonRadioOption {
  letter: Letter;
  content: ReactNode;
}

interface PearsonRadioGroupProps {
  name: string;
  options: PearsonRadioOption[];
  value: Letter | null;
  onChange: (letter: Letter) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Native radio group styled like small system radios.
 * No A/B/C labels (official ESAT player shows radio + answer text only).
 */
export function PearsonRadioGroup({
  name,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: PearsonRadioGroupProps) {
  return (
    <ul className={cn("pearson-radio-list", className)} role="radiogroup">
      {options.map((opt) => {
        const id = `${name}-${opt.letter}`;
        return (
          <li key={opt.letter}>
            <label className="pearson-radio-row" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name={name}
                value={opt.letter}
                checked={value === opt.letter}
                disabled={disabled}
                onChange={() => onChange(opt.letter)}
              />
              <span className="pearson-radio-body">{opt.content}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
