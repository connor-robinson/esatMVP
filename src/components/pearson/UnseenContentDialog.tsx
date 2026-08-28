"use client";

import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";
import { InfoIcon } from "./PearsonIcons";

/**
 * Unseen Content dialog.
 * Exact wording from VERIFIED_ESAT (UAT-UK Candidate Handbook 2027 Entry).
 */
interface UnseenContentDialogProps {
  onOk: () => void;
}

export function UnseenContentDialog({ onOk }: UnseenContentDialogProps) {
  return (
    <div className="pearson-dialog-backdrop" role="presentation">
      <div
        className="pearson-dialog pearson-dialog--blue"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pearson-unseen-title"
        aria-describedby="pearson-unseen-body"
      >
        <h2 id="pearson-unseen-title" className="pearson-dialog-blue-title">
          Unseen Content
        </h2>
        <div id="pearson-unseen-body" className="pearson-dialog-blue-body">
          <InfoIcon />
          <p style={{ margin: 0 }}>
            You have not yet viewed the entire screen. Make sure you play all
            multimedia content, select every tab and scroll to every corner.
          </p>
        </div>
        <div className="pearson-dialog-blue-actions">
          <button type="button" onClick={onOk} autoFocus>
            <PearsonMnemonicLabel label="OK" letter="O" />
          </button>
        </div>
      </div>
    </div>
  );
}
