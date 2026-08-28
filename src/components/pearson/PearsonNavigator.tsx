"use client";

import type { PearsonNavRow } from "@/lib/pearson/types";

interface PearsonNavigatorProps {
  rows: PearsonNavRow[];
  onJump: (questionIndex: number) => void;
  onClose: () => void;
}

function statusLabel(status: PearsonNavRow["status"]): string {
  if (status === "complete") return "Complete";
  if (status === "incomplete") return "Incomplete";
  return "Unseen";
}

/**
 * Item Navigator overlay.
 * VERIFIED_PEARSON_PLATFORM (used by ESAT sample player descriptions):
 * Complete / Incomplete / Unseen + flagged column.
 */
export function PearsonNavigator({
  rows,
  onJump,
  onClose,
}: PearsonNavigatorProps) {
  return (
    <div className="pearson-nav-overlay" role="dialog" aria-label="Navigator">
      <h1 style={{ fontSize: 16, margin: "0 0 12px" }}>Navigator</h1>
      <table className="pearson-nav-table">
        <thead>
          <tr>
            <th>Question #</th>
            <th>Status</th>
            <th>Flagged</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.questionId}>
              <td>
                <button
                  type="button"
                  onClick={() => onJump(row.questionIndex)}
                >
                  {row.questionNumber}
                </button>
              </td>
              <td>{statusLabel(row.status)}</td>
              <td>{row.flagged ? "Yes" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 16 }}>
        <button type="button" className="pearson-footer-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
