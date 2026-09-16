"use client";

import { MathContent } from "@/components/shared/MathContent";
import type { LetterLabeledTable } from "@/lib/papers/tableBackedOptions";
import { cn } from "@/lib/utils";

export type EupOptionTableRowState = {
  wrong?: boolean;
  showCorrect?: boolean;
  flashCorrect?: boolean;
  flashWrong?: boolean;
};

interface EupOptionTableProps {
  name: string;
  table: LetterLabeledTable;
  value: string | null;
  onChange: (letter: string) => void;
  locked?: boolean;
  rowState?: (letter: string) => EupOptionTableRowState;
}

/**
 * A–H comparison table with radios on each row (ESAT "which row" style).
 */
export function EupOptionTable({
  name,
  table,
  value,
  onChange,
  locked = false,
  rowState,
}: EupOptionTableProps) {
  return (
    <div className="stem-table eup-option-table" role="radiogroup" aria-label="Answer options">
      <table>
        <thead>
          <tr>
            {table.headers.map((header, index) => (
              <th key={`h-${index}`}>
                {header ? (
                  <MathContent content={header} className="text-inherit inline" />
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const id = `${name}-${row.letter}`;
            const state = rowState?.(row.letter) ?? {};
            const selected = value === row.letter || Boolean(state.showCorrect);
            const rowLocked = locked || Boolean(state.wrong);
            const dim =
              locked && !state.showCorrect && !state.wrong;

            return (
              <tr
                key={row.letter}
                className={cn(
                  "eup-option-table-row",
                  selected && "eup-option-table-row--selected",
                  state.showCorrect && "eup-option-table-row--correct",
                  state.wrong && "eup-option-table-row--wrong",
                  locked && "eup-option-table-row--locked",
                  dim && "eup-option-table-row--dim",
                  state.flashCorrect && "eup-option-table-row--flash-correct",
                  state.flashWrong && "eup-option-table-row--flash-wrong",
                )}
                onClick={() => {
                  if (!rowLocked) onChange(row.letter);
                }}
              >
                <td>
                  <label className="eup-option-table-letter" htmlFor={id}>
                    <span className="eup-radio-control">
                      <input
                        id={id}
                        type="radio"
                        name={name}
                        value={row.letter}
                        checked={selected}
                        disabled={rowLocked}
                        onChange={() => onChange(row.letter)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Option ${row.letter}`}
                      />
                    </span>
                    {row.letter}
                  </label>
                </td>
                {row.cells.map((cell, index) => (
                  <td key={`${row.letter}-${index}`}>
                    {cell ? (
                      <MathContent content={cell} className="text-inherit inline" />
                    ) : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
