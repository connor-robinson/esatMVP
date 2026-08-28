"use client";

import type { PearsonNavRow } from "@/lib/pearson/types";
import { NavigatorWindowIcon } from "./PearsonIcons";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";

interface PearsonNavigatorProps {
  rows: PearsonNavRow[];
  unseenIncompleteCount: number;
  onJump: (questionIndex: number) => void;
  onClose: () => void;
}

function statusLabel(status: PearsonNavRow["status"]): string {
  if (status === "complete") return "Complete";
  if (status === "incomplete") return "Incomplete";
  return "Unseen";
}

function statusClass(status: PearsonNavRow["status"]): string {
  if (status === "complete") return "";
  return status === "incomplete" ? "status-incomplete" : "status-unseen";
}

export function PearsonNavigator({
  rows,
  currentQuestionIndex,
  unseenIncompleteCount,
  onJump,
  onClose,
}: PearsonNavigatorProps) {
  return (
    <div className="pearson-nav-modal-wrap" role="presentation">
      <div
        className="pearson-nav-window"
        role="dialog"
        aria-modal="true"
        aria-label="Navigator"
      >
        <div className="pearson-nav-window-header">
          <NavigatorWindowIcon />
          <span>Navigator - select a question to go to it</span>
        </div>

        <div className="pearson-nav-window-body">
          <table className="pearson-nav-table">
            <thead>
              <tr>
                <th>
                  Question # <span aria-hidden="true">▲</span>
                </th>
                <th>Status</th>
                <th>Flagged for Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.questionId}
                  className={
                    row.status === "complete"
                      ? "pearson-nav-row--complete"
                      : undefined
                  }
                >
                  <td>
                    <button
                      type="button"
                      className="pearson-nav-link"
                      onClick={() => onJump(row.questionIndex)}
                    >
                      Question {row.questionNumber}
                    </button>
                  </td>
                  <td className={statusClass(row.status)}>
                    {statusLabel(row.status)}
                  </td>
                  <td>
                    {row.flagged ? (
                      <span
                        className="pearson-nav-flag-icon"
                        aria-label="Flagged"
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pearson-nav-window-footer">
          <span>
            {unseenIncompleteCount} Unseen/Incomplete
          </span>
          <button type="button" className="pearson-nav-close-btn" onClick={onClose}>
            <PearsonMnemonicLabel label="Close" letter="C" />
          </button>
        </div>
      </div>
    </div>
  );
}
