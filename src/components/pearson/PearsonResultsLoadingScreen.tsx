"use client";

import { PearsonExamShell } from "./PearsonExamShell";
import { PearsonLoadingScreen } from "./PearsonLoadingScreen";

interface PearsonResultsLoadingScreenProps {
  onComplete: () => void;
}

export function PearsonResultsLoadingScreen({
  onComplete,
}: PearsonResultsLoadingScreenProps) {
  return (
    <PearsonExamShell colourScheme="standard" zoomLevel={100}>
      <PearsonLoadingScreen
        label="Loading results, please wait..."
        durationMs={1800}
        onComplete={onComplete}
      />
    </PearsonExamShell>
  );
}
