"use client";

import { useEffect, useState } from "react";

interface DesktopFidelityGateProps {
  /** Viewport width below which the notice appears. */
  breakpointPx?: number;
}

/**
 * VERIFIED_ESAT: desktop recommended for sample tests.
 * Shows a notice on narrow screens; optionally allows continue.
 */
export function DesktopFidelityGate({
  breakpointPx = 900,
}: DesktopFidelityGateProps) {
  const [narrow, setNarrow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  if (!narrow || dismissed) return null;

  return (
    <div className="pearson-fidelity-gate" role="dialog" aria-modal="true">
      <div className="pearson-fidelity-gate-inner">
        <h2>Desktop recommended</h2>
        <p>
          For an accurate Pearson VUE / ESAT simulation, use a desktop or laptop
          with a full-size display. Layout and controls may not match the live
          exam on a narrow screen.
        </p>
        <button type="button" onClick={() => setDismissed(true)}>
          Continue anyway
        </button>
      </div>
    </div>
  );
}
