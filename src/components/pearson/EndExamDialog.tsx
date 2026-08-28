"use client";

import { splitMnemonic } from "@/lib/pearson/shortcuts";
import { InfoIcon } from "./PearsonIcons";

interface EndExamDialogProps {
  onYes: () => void;
  onNo: () => void;
}

/**
 * End Exam confirmation (screens 11).
 * VERIFIED_ESAT specimen player Aug 2026.
 */
export function EndExamDialog({ onYes, onNo }: EndExamDialogProps) {
  const yesParts = splitMnemonic("Yes", "Y");
  const noParts = splitMnemonic("No", "N");

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
            {yesParts ? (
              <>
                {yesParts.before}
                <span className="mnemonic">{yesParts.mnemonic}</span>
                {yesParts.after}
              </>
            ) : (
              "Yes"
            )}
          </button>
          <button type="button" onClick={onNo}>
            {noParts ? (
              <>
                {noParts.before}
                <span className="mnemonic">{noParts.mnemonic}</span>
                {noParts.after}
              </>
            ) : (
              "No"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
