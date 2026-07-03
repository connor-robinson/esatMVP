"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CALIBRATION_ROUTES } from "@/lib/calibration/constants";
import type { CalibrationSummary } from "@/lib/calibration/types";

interface CalibrationStatusProps {
  calibration: CalibrationSummary;
  compact?: boolean;
}

export function CalibrationStatusCard({
  calibration,
  compact = false,
}: CalibrationStatusProps) {
  const { status, progress, result } = calibration;

  if (status === "none" && compact) return null;

  let body: React.ReactNode = null;

  if (status === "in_progress" && progress) {
    body = (
      <>
        <p className="text-sm text-text-muted">
          {progress.questionsCompleted} of {progress.questionsTotal} questions
          completed.
        </p>
        <Link
          href={CALIBRATION_ROUTES.session}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          Continue calibration
        </Link>
      </>
    );
  } else if (status === "completed" && result) {
    body = (
      <>
        {result.summaryText ? (
          <p className="text-sm text-text">{result.summaryText}</p>
        ) : null}
        <Link
          href={CALIBRATION_ROUTES.results}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          View full results
        </Link>
      </>
    );
  } else if (status === "outdated") {
    body = (
      <>
        <p className="text-sm text-text-muted">
          Your last calibration may no longer reflect your current level.
        </p>
        <Link
          href={CALIBRATION_ROUTES.hub}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          Retake calibration
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-text-muted">
          A short diagnostic covering speed, accuracy, and weak skill areas.
        </p>
        <Link
          href={CALIBRATION_ROUTES.hub}
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
        >
          Start free calibration
        </Link>
      </>
    );
  }

  return (
    <Card variant="subtle" className={compact ? "p-4" : "p-5"}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        Calibration
      </h3>
      <div className="mt-3">{body}</div>
    </Card>
  );
}
