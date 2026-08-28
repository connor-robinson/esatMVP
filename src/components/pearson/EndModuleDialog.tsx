"use client";

/**
 * End-of-module confirmation.
 * VERIFIED_ESAT: leaving review shows a warning that the module/paper is about
 * to end; confirm ends permanently. Serious tone (not "Ready to submit?").
 */
interface EndModuleDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function EndModuleDialog({ onYes, onNo }: EndModuleDialogProps) {
  return (
    <div className="pearson-dialog-backdrop" role="presentation">
      <div
        className="pearson-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pearson-end-title"
        aria-describedby="pearson-end-body"
      >
        <h2 id="pearson-end-title" className="pearson-dialog-title">
          End Module
        </h2>
        <p id="pearson-end-body" className="pearson-dialog-body">
          You are about to end this module. Once you confirm, you will not be
          able to return to these questions. Any unused time will not carry over
          to another module. Do you want to end this module permanently?
        </p>
        <div className="pearson-dialog-actions">
          <button type="button" onClick={onNo}>
            No
          </button>
          <button type="button" onClick={onYes} autoFocus>
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
