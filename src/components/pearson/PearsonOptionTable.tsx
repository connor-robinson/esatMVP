"use client";

import { MathContent } from "@/components/shared/MathContent";
import type { LetterLabeledTable } from "@/lib/papers/tableBackedOptions";
import type { Letter } from "@/types/papers";
import { cn } from "@/lib/utils";

interface PearsonOptionTableProps {
  name: string;
  table: LetterLabeledTable;
  value: Letter | null;
  onChange: (letter: Letter) => void;
  disabled?: boolean;
}

/**
 * A–H comparison table with a radio on each row, so the table is the answer list.
 */
export function PearsonOptionTable({
  name,
  table,
  value,
  onChange,
  disabled = false,
}: PearsonOptionTableProps) {
  return (
    <div className="stem-content">
      <div className="stem-table pearson-option-table" role="radiogroup">
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
              const selected = value === row.letter;
              return (
                <tr
                  key={row.letter}
                  className={cn(
                    "pearson-option-table-row",
                    selected && "pearson-option-table-row-selected",
                  )}
                  onClick={() => {
                    if (!disabled) onChange(row.letter);
                  }}
                >
                  <td>
                    <label className="pearson-option-table-letter" htmlFor={id}>
                      <span className="pearson-radio-control">
                        <input
                          id={id}
                          type="radio"
                          name={name}
                          value={row.letter}
                          checked={selected}
                          disabled={disabled}
                          onChange={() => onChange(row.letter)}
                          onClick={(event) => event.stopPropagation()}
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
    </div>
  );
}
