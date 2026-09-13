"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@/components/auth/SupabaseSessionProvider";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { cn } from "@/lib/utils";

type ScorePillProps = {
  label: string;
  /** Prominent ESAT score hero treatment. */
  prominent?: boolean;
  loading?: boolean;
  locked?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function HubMarkStatPill({
  label,
  prominent,
  loading,
  locked,
  children,
  className,
}: ScorePillProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-black/10 bg-white px-4 py-5 text-black",
        prominent
          ? "min-h-[9.5rem] rounded-md bg-[#E8F1FF] sm:min-h-[10.5rem]"
          : "min-h-[9.5rem] rounded-md sm:min-h-[10.5rem]",
        className,
      )}
    >
      <div
        className={cn(
          "font-semibold uppercase tracking-wide text-black",
          prominent ? "text-sm sm:text-base" : "text-xs",
        )}
      >
        {label}
      </div>
      <div className="mt-3 flex min-h-[3.25rem] items-center justify-center">
        {loading ? (
          <span
            aria-label="Loading"
            className="h-9 w-9 animate-spin rounded-full border-[3px] border-black/15 border-t-black"
          />
        ) : locked ? (
          <span className="text-sm font-semibold text-black/70">••••</span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

type LoginBannerProps = {
  redirectTo?: string;
  className?: string;
};

export function HubMarkLoginBanner({
  redirectTo = "/past-papers/mark",
  className,
}: LoginBannerProps) {
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
    <div
      className={cn(
        "flex flex-col gap-4 rounded-md border border-black/10 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-bold tracking-tight text-black sm:text-lg">
          Log in to view
        </p>
        <p className="mt-1 text-sm text-black/70">
          See your ESAT score, which questions you got wrong, and full session
          insights.
        </p>
      </div>
      <div className="w-full shrink-0 sm:max-w-[15.5rem]">
        <GoogleAuthButton
          mode="signin"
          loading={loading}
          onClick={() => void handleGoogle()}
        />
      </div>
    </div>
  );
}

/** Fake percentile card content shown blurred behind the login gate. */
export function HubMarkPercentilePreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-black/10 bg-white p-4",
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
      <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4 backdrop-blur-[1px]">
        <p className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm">
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
    <div className="relative overflow-hidden rounded-md border border-black/10 bg-white p-6 sm:p-8">
      <div
        className="pointer-events-none flex select-none flex-col items-center gap-6 blur-[7px] opacity-75"
        aria-hidden
      >
        <div className="text-lg font-semibold text-black">Mistake analysis</div>
        <svg viewBox="0 0 120 120" className="h-44 w-44" aria-hidden>
          <circle cx="60" cy="60" r="48" fill="#E8F1FF" />
          <path d="M60 60 L60 12 A48 48 0 0 1 104 78 Z" fill="#91b4a4" />
          <path d="M60 60 L104 78 A48 48 0 0 1 28 95 Z" fill="#af6da1" />
          <path d="M60 60 L28 95 A48 48 0 0 1 60 12 Z" fill="#cf5b5b" />
          <circle cx="60" cy="60" r="22" fill="white" />
        </svg>
        <div className="flex flex-wrap justify-center gap-3 text-xs text-black/70">
          <span>Concept gap</span>
          <span>Careless</span>
          <span>Timing</span>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 p-4 backdrop-blur-[1.5px]">
        <div className="w-full max-w-sm space-y-4 rounded-md border border-black/10 bg-white p-5 text-center shadow-sm">
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
