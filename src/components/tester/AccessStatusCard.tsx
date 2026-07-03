"use client";

import { formatExpiry, formatRemaining } from "@/lib/tester/format";
import type { TesterState } from "@/lib/tester/types";

const STAGE_LABEL: Record<string, string> = {
  stage_1_active: "First Look",
  stage_2_active: "Active Tester",
  stage_3_active: "Founding Tester",
};

/**
 * Always shows BOTH the exact server expiry (source of truth) and an approximate
 * countdown, per the programme requirements.
 */
export function AccessStatusCard({ state }: { state: TesterState }) {
  const stageLabel = STAGE_LABEL[state.status] ?? "Tester";

  return (
    <div className="rounded-organic-xl bg-surface-elevated p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          {stageLabel}
        </span>
        <span
          className={
            state.premiumActive
              ? "rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success"
              : "rounded-full bg-surface-subtle px-3 py-1 text-xs font-semibold text-text-muted"
          }
        >
          {state.premiumActive ? "Premium active" : "Access expired"}
        </span>
      </div>

      {state.premiumActive && state.accessExpiresAt ? (
        <div className="mt-4">
          <p className="text-sm text-text">
            Access ends on{" "}
            <span className="font-semibold">
              {formatExpiry(state.accessExpiresAt)}
            </span>
            .
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {formatRemaining(state.msRemaining)}
          </p>
        </div>
      ) : null}

      {state.sessionsRequiredForNext ? (
        <p className="mt-4 text-sm text-text-muted">
          You have completed{" "}
          <span className="font-semibold text-text">
            {state.meaningfulSessionsCompleted}
          </span>{" "}
          of the{" "}
          <span className="font-semibold text-text">
            {state.sessionsRequiredForNext}
          </span>{" "}
          qualifying session
          {state.sessionsRequiredForNext === 1 ? "" : "s"} needed for the next
          reward.
        </p>
      ) : null}

      {state.nextRewardLabel ? (
        <p className="mt-3 text-sm text-text-muted">
          Next reward: <span className="font-semibold text-text">{state.nextRewardLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
