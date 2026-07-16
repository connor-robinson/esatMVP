"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import { cn } from "@/lib/utils";

interface CalibrationPromoProps {
  placement: string;
  className?: string;
}

/**
 * Contextual cross-link to the Math 1 calibration. Use in empty states,
 * landing pages and results pages to guide users to "what to practise next".
 */
export function CalibrationPromo({ placement, className }: CalibrationPromoProps) {
  return (
    <Card
      variant="flat"
      className={cn("rounded-organic-lg bg-surface-subtle p-5", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">
            Not sure what to practise next?
          </p>
          <p className="mt-0.5 text-sm text-text-muted">
            Take the 23-minute Math 1 calibration for a personalised breakdown.
          </p>
        </div>
        <Link
          href={CALIBRATION_ROUTES.math1}
          onClick={() =>
            void trackCalibrationEvent("calibration_start_clicked", {
              cta_placement: placement,
            })
          }
          className="inline-flex shrink-0 items-center rounded-organic-md bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover"
        >
          Take the calibration
        </Link>
      </div>
    </Card>
  );
}
