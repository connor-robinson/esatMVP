"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  getActiveAttempt,
  getCompletedAttempts,
} from "@/lib/calibration/attempt";
import { trackCalibrationEvent } from "@/lib/calibration/analytics";
import {
  CALIBRATION_ROUTES,
  CALIBRATION_TOTAL_QUESTIONS,
  CALIBRATION_TIME_LIMIT_SECONDS,
  calibrationResultsRoute,
} from "@/lib/calibration/constants";
import type { CalibrationAttempt } from "@/lib/calibration/types";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { currentGaPath, rememberGaSourcePage } from "@/lib/ga";

/** Match Pearson exam content typeface. */
const PEARSON_FONT = 'Tahoma, Arial, Helvetica, sans-serif';

export function CalibrationLandingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSupabaseSession();
  const [inProgress, setInProgress] = useState<CalibrationAttempt | null>(null);
  const [resolving, setResolving] = useState(true);
  const stayOnIntro = searchParams.get("view") === "intro";

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const active = getActiveAttempt();
      const completed = getCompletedAttempts();
      const localLatest = completed[0] ?? null;

      void trackCalibrationEvent("calibration_landing_viewed", {
        user_state: session?.user ? "free" : "signed_out",
      });

      if (active) {
        if (!cancelled) {
          setInProgress(active);
          setResolving(false);
        }
        return;
      }

      // Local UI work: ?view=intro keeps the landing visible even after a prior attempt.
      if (!stayOnIntro && localLatest) {
        router.replace(calibrationResultsRoute(localLatest.attemptId));
        return;
      }

      if (!stayOnIntro && session?.user) {
        try {
          const res = await fetch("/api/calibration/attempts");
          const data = await res.json();
          const latest = (data.attempts ?? []).find(
            (a: { status: string; id: string }) => a.status === "completed",
          );
          if (latest?.id && !cancelled) {
            router.replace(calibrationResultsRoute(latest.id));
            return;
          }
        } catch {
          /* fall through to start landing */
        }
      }

      if (!cancelled) setResolving(false);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
    // Depend on user id only so token refresh does not re-run and bounce the page.
  }, [router, session?.user?.id, stayOnIntro]);

  const timeLimitMinutes = Math.round(CALIBRATION_TIME_LIMIT_SECONDS / 60);

  const start = () => {
    void trackCalibrationEvent("calibration_start_clicked", {
      user_state: session?.user ? "free" : "signed_out",
      cta_placement: "landing_primary",
    });
    rememberGaSourcePage(currentGaPath() ?? CALIBRATION_ROUTES.math1);
    router.push(CALIBRATION_ROUTES.test);
  };

  if (resolving) {
    return (
      <div
        className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#141414]"
        style={{ fontFamily: PEARSON_FONT }}
      >
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] bg-[#141414] text-[#f0f0f0]"
      style={{ fontFamily: PEARSON_FONT }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10 sm:py-20 lg:max-w-6xl lg:px-14">
        <h1 className="text-[2rem] font-bold leading-[1.2] tracking-tight text-[#f4f4f4] sm:text-[2.5rem] lg:text-[2.75rem]">
          Free ESAT diagnostic test
        </h1>

        <p className="mt-3 text-lg font-semibold text-[#e8e8e8] sm:text-xl">
          Maths 1 calibration
        </p>

        <div className="mt-8 max-w-4xl space-y-4 text-[15px] leading-[1.55] text-[#d0d0d0] sm:text-base">
          <p>
            Welcome to a short diagnostic designed to calibrate student&apos;s
            abilities for the ESAT.
          </p>
          <p>
            You will answer 15 multiple-choice questions in 20 minutes.
            Calculators are not permitted. Choose one answer for each question.
          </p>
          <p>
            There are no penalties for incorrect answers. If you get stuck, make
            your best choice and keep moving.
          </p>
        </div>

        <div className="mt-8 max-w-3xl overflow-hidden border border-white/15 bg-[#1c1c1c]">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="border-b border-white/12 bg-[#222222]">
                <th className="px-4 py-3 font-semibold text-[#f0f0f0]">
                  Number of Questions
                </th>
                <th className="px-4 py-3 font-semibold text-[#f0f0f0]">Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 tabular-nums text-[#d8d8d8]">
                  {CALIBRATION_TOTAL_QUESTIONS}
                </td>
                <td className="px-4 py-3 tabular-nums text-[#d8d8d8]">
                  {timeLimitMinutes} minutes
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {inProgress ? (
          <p className="mt-6 text-sm text-[#a8a8a8]">
            You have an unfinished attempt. Resume to continue where you left
            off.
          </p>
        ) : null}

        <div className="mt-10 flex flex-col items-start gap-3">
          <button
            type="button"
            onClick={start}
            className="inline-flex min-w-[11rem] items-center justify-center bg-[#006daa] px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-[#1a82c0]"
          >
            {inProgress ? "Resume" : "Next"}
          </button>

          {!session?.user ? (
            <Link
              href={`/login?redirectTo=${encodeURIComponent(CALIBRATION_ROUTES.math1)}`}
              onClick={() =>
                void trackCalibrationEvent("calibration_sign_in_clicked", {
                  cta_placement: "landing_secondary",
                  user_state: "signed_out",
                })
              }
              className="text-sm text-[#a8a8a8] underline-offset-2 transition hover:text-[#f0f0f0] hover:underline"
            >
              Sign in first to save progress
            </Link>
          ) : null}
        </div>

        <section
          id="how-estimate-works"
          className="mt-14 max-w-4xl border-t border-white/10 pt-8"
        >
          <h2 className="text-sm font-semibold tracking-wide text-[#e8e8e8]">
            How this estimate works
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#9a9a9a]">
            After you finish, we show one Estimated ESAT score from the pattern
            of right and wrong answers on this 15-question calibration. Timing
            is used only for pace feedback. This is a provisional diagnostic
            estimate, not an official ESAT score.
          </p>
        </section>

        <p className="mt-8 max-w-4xl text-xs leading-relaxed text-[#777777]">
          ESAT Camp is an independent preparation resource and is not affiliated
          with or endorsed by UAT-UK or Pearson VUE.
        </p>
      </div>
    </div>
  );
}
