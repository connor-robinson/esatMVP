"use client";

import type { PearsonEndPrompt } from "@/lib/pearson/types";
import { PearsonBlueConfirmDialog } from "./PearsonBlueConfirmDialog";

interface EndExamDialogProps {
  variant?: PearsonEndPrompt;
  onYes: () => void;
  onNo: () => void;
}

const COPY: Record<
  PearsonEndPrompt,
  { title: string; first: string; second: string }
> = {
  exam: {
    title: "End Exam",
    first: "You have chosen to end this exam.",
    second: "Are you sure you want to end this exam?",
  },
  section: {
    title: "End Section",
    first: "You have chosen to end this section.",
    second: "Are you sure you want to end this section?",
  },
  continue: {
    title: "Continue to Next Section",
    first: "You have reached the end of this section.",
    second: "Are you sure you want to continue to the next section?",
  },
};

export function EndExamDialog({
  variant = "exam",
  onYes,
  onNo,
}: EndExamDialogProps) {
  const copy = COPY[variant];
  return (
    <PearsonBlueConfirmDialog title={copy.title} onYes={onYes} onNo={onNo}>
      <p style={{ margin: "0 0 8px" }}>{copy.first}</p>
      <p style={{ margin: 0 }}>{copy.second}</p>
    </PearsonBlueConfirmDialog>
  );
}
