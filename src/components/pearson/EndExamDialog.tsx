"use client";

import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";
import { InfoIcon } from "./PearsonIcons";

interface EndExamDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function EndExamDialog({ onYes, onNo }: EndExamDialogProps) {
  return (
    <div className="pearson-dialog-backdrop" role="presentation">
      <div
        className="pearson-dialog pearson-dialog--blue"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pearson-end-exam-title"
        aria-describedby="pearson-end-exam-body"
      >
        <h2 id="pearson-end-exam-title" className="pearson-dialog-blue-title">
          End Exam
        </h2>
        <div id="pearson-end-exam-body" className="pearson-dialog-blue-body">
          <InfoIcon />
          <div>
            <p style={{ margin: "0 0 8px" }}>You have chosen to end this exam.</p>
            <p style={{ margin: 0 }}>Are you sure you want to end this exam?</p>
          </div>
        </div>
        <div className="pearson-dialog-blue-actions">
          <button type="button" onClick={onYes} autoFocus>
            <PearsonMnemonicLabel label="Yes" letter="Y" />
          </button>
          <button type="button" onClick={onNo}>
            <PearsonMnemonicLabel label="No" letter="N" />
          </button>
        </div>
      </div>
    </div>
  );
}
