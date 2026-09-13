"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/components/auth/SupabaseSessionProvider";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { cn } from "@/lib/utils";

const PILL_SURFACE = "bg-white";

type ScorePillProps = {
  label: string;
  /** Prominent ESAT score hero treatment. */
  prominent?: boolean;
  loading?: boolean;
  /** When true, hide score children (login CTA is rendered via footer). */
  hideValue?: boolean;
  children?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export function HubMarkStatPill({
  label,
  prominent,
  loading,
  hideValue,
  children,
  className,
  footer,
}: ScorePillProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-5 text-black",
        PILL_SURFACE,
        prominent
          ? "min-h-[10.5rem] rounded-md sm:min-h-[11.5rem]"
          : "min-h-[9.5rem] rounded-md sm:min-h-[10.5rem]",
        className,
      )}
    >
      <div
        className={cn(
          "font-semibold uppercase tracking-wide text-black",
          prominent ? "text-base sm:text-lg" : "text-xs",
        )}
      >
        {label}
      </div>
      {loading ? (
        <div className="mt-3 flex min-h-[3.5rem] items-center justify-center">
          <span
            aria-label="Loading"
            className="h-9 w-9 animate-spin rounded-full border-[3px] border-black/15 border-t-black"
          />
        </div>
      ) : hideValue ? null : (
        <div className="mt-3 flex min-h-[3.5rem] items-center justify-center">
          {children}
        </div>
      )}
      {footer ? <div className="mt-3 w-full">{footer}</div> : null}
    </div>
  );
}

type LoginUnderScoreProps = {
  redirectTo?: string;
};

/** Google CTA stacked under the ESAT score label. */
export function HubMarkScoreLoginCta({
  redirectTo = "/past-papers/mark",
}: LoginUnderScoreProps) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle(supabase, redirectTo);
      if (error) throw error;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-[92%] max-w-[14.5rem] flex-col items-center gap-2">
      <GoogleAuthButton
        mode="signin"
        loading={loading}
        onClick={() => void handleGoogle()}
        className="h-12 text-[13px]"
      />
      <p className="text-center text-xs font-medium leading-snug text-black/70">
        Free. Sign in to show your score.
      </p>
    </div>
  );
}

/** Fake percentile card content shown blurred behind the login gate. */
export function HubMarkPercentilePreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md p-4",
        PILL_SURFACE,
        className,
      )}
    >
      <div
        className="pointer-events-none select-none space-y-4 blur-[6px] opacity-80"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold text-black">
            Section Percentiles
          </div>
          <div className="h-9 w-40 rounded-md bg-black/5" />
        </div>
        <div className="text-center text-5xl font-bold tracking-tight text-black">
          TOP 18.4%
        </div>
        <div className="mx-auto h-28 w-full max-w-md rounded-md bg-gradient-to-t from-[#91b4a4]/40 to-transparent" />
        <p className="text-center text-xs text-black/60">
          If you sat the ESAT today, 18.4% of test-takers would outperform you.
        </p>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[#f0f0f2]/55 p-4 backdrop-blur-[1px]">
        <p className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black">
          Log in to view
        </p>
      </div>
    </div>
  );
}

/** Blurred pie preview for the Mistakes tab unlock gate. */
export function HubMarkMistakesPieTeaser({
  showGoogleLogin,
  redirectTo = "/past-papers/mark",
}: {
  showGoogleLogin: boolean;
  redirectTo?: string;
}) {
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle(supabase, redirectTo);
      if (error) throw error;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-md bg-white p-6 sm:min-h-[32rem] sm:p-10">
      {/* Preview layer: keep blur light so the pie still reads. */}
      <div
        className="pointer-events-none flex select-none flex-col items-center gap-8 pt-4 blur-[2.5px] sm:pt-8"
        aria-hidden
      >
        <div className="text-lg font-semibold text-black sm:text-xl">
          Mistake analysis
        </div>
        <div className="relative h-52 w-52 sm:h-60 sm:w-60">
          <div
            className="h-full w-full rounded-full shadow-sm"
            style={{
              background:
                "conic-gradient(#4b6b64 0deg 126deg, #af6da1 126deg 223deg, #cf5b5b 223deg 360deg)",
            }}
          />
          <div className="absolute inset-[28%] rounded-full bg-white" />
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-black/80">
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#4b6b64" }}
            />
            Concept gap
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#af6da1" }}
            />
            Careless
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#cf5b5b" }}
            />
            Timing
          </span>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/35 p-4 backdrop-blur-[0.5px]">
        <div className="w-full max-w-sm space-y-4 rounded-md bg-white/95 p-5 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-bold tracking-tight text-black">
            Unlock mistake analysis
          </p>
          <p className="text-sm text-black/70">
            See patterns across wrong answers and build a fix list for your next
            paper.
          </p>
          {showGoogleLogin ? (
            <GoogleAuthButton
              mode="signin"
              loading={loading}
              onClick={() => void handleGoogle()}
            />
          ) : (
            <a
              href="/pricing"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-black px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              View plans
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Brief loading phase before revealing the login gate on hub score cards. */
export function useHubScoreReveal(enabled: boolean, delayMs = 1600) {
  const [phase, setPhase] = useState<"loading" | "ready">(
    enabled ? "loading" : "ready",
  );

  useEffect(() => {
    if (!enabled) {
      setPhase("ready");
      return;
    }
    setPhase("loading");
    const timer = window.setTimeout(() => setPhase("ready"), delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, delayMs]);

  return phase;
}
