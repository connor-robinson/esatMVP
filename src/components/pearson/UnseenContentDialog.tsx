"use client";

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
        className="pearson-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pearson-unseen-title"
        aria-describedby="pearson-unseen-body"
      >
        <h2 id="pearson-unseen-title" className="pearson-dialog-title">
          Unseen Content
        </h2>
        <p id="pearson-unseen-body" className="pearson-dialog-body">
          You have not yet viewed the entire screen. Make sure you play all
          multimedia content, select every tab and scroll to every corner.
        </p>
        <div className="pearson-dialog-actions">
          <button type="button" onClick={onOk} autoFocus>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
