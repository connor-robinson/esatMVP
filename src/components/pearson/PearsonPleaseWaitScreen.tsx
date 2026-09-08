"use client";

import { PearsonExamShell } from "./PearsonExamShell";
import { PearsonLoadingScreen } from "./PearsonLoadingScreen";

type Props = {
  label?: string;
};

/**
 * Full-screen ESAT "Loading, please wait..." overlay. Holds until unmounted.
 */
export function PearsonPleaseWaitScreen({
  label = "Loading, please wait...",
}: Props) {
  return (
    <PearsonExamShell colourScheme="standard" zoomLevel={100} className="!z-[200]">
      <PearsonLoadingScreen label={label} />
    </PearsonExamShell>
  );
}
