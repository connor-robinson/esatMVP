"use client";

import { PearsonBlueConfirmDialog } from "./PearsonBlueConfirmDialog";

interface EndExamDialogProps {
  onYes: () => void;
  onNo: () => void;
}

export function EndExamDialog({ onYes, onNo }: EndExamDialogProps) {
  return (
    <PearsonBlueConfirmDialog title="End Exam" onYes={onYes} onNo={onNo}>
      <p style={{ margin: "0 0 8px" }}>You have chosen to end this exam.</p>
      <p style={{ margin: 0 }}>Are you sure you want to end this exam?</p>
    </PearsonBlueConfirmDialog>
  );
}
