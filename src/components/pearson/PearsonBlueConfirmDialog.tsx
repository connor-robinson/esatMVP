"use client";

import type { ReactNode } from "react";
import { PearsonMnemonicLabel } from "./PearsonMnemonicLabel";
import { InfoIcon } from "./PearsonIcons";

interface PearsonBlueConfirmDialogProps {
  title: string;
  children: ReactNode;
  onYes: () => void;
  onNo: () => void;
}

export function PearsonBlueConfirmDialog({
  title,
  children,
  onYes,
  onNo,
}: PearsonBlueConfirmDialogProps) {
  return (
    <div className="pearson-dialog-backdrop" role="presentation">
      <div
        className="pearson-dialog pearson-dialog--blue"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pearson-blue-confirm-title"
      >
        <h2 id="pearson-blue-confirm-title" className="pearson-dialog-blue-title">
          {title}
        </h2>
        <div className="pearson-dialog-blue-body">
          <InfoIcon />
          <div>{children}</div>
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
