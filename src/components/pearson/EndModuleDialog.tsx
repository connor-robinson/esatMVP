"use client";

import { PearsonBlueConfirmDialog } from "./PearsonBlueConfirmDialog";

interface EndModuleDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function EndModuleDialog({ onYes, onNo }: EndModuleDialogProps) {
  return (
    <PearsonBlueConfirmDialog title="End Exam" onYes={onYes} onNo={onNo}>
      <p style={{ margin: "0 0 8px" }}>You have chosen to end this exam.</p>
      <p style={{ margin: 0 }}>Are you sure you want to end this exam?</p>
    </PearsonBlueConfirmDialog>
  );
}
