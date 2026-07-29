/**
 * Login / sign-up — Google OAuth (same flow; Supabase creates account on first sign-in).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseClient, useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import {
  GoogleAuthButton,
  type GoogleAuthMode,
} from "@/components/auth/GoogleAuthButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";

type AuthMode = GoogleAuthMode;

const COPY: Record<
  AuthMode,
  { title: string; subtitle: string; switchPrompt: string; switchLabel: string }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to save progress and sync across devices.",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
  },
  signup: {
    title: "Sign up for free",
    subtitle:
      "Create an account to save sessions, unlock results, and pick up where you left off.",
    switchPrompt: "I already have an account.",
    switchLabel: "Sign in",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const mode: AuthMode = useMemo(() => {
    const fromUrl = searchParams.get("mode");
    return fromUrl === "signup" ? "signup" : "signin";
  }, [searchParams]);

  const redirectTo = searchParams.get("redirectTo") || "/past-papers/library";
  const copy = COPY[mode];

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          setIsChecking(false);
          return;
        }

        if (currentSession?.user) {
          try {
            const prefsRes = await fetch("/api/profile/preferences");
            const prefs = prefsRes.ok ? await prefsRes.json() : null;
            const { resolvePostAuthPath } = await import("@/lib/onboarding/redirect");
            router.push(
              resolvePostAuthPath(
                prefs
                  ? {
                      username: prefs.username ?? null,
                      onboarding_completed: prefs.onboarding_completed ?? null,
                    }
                  : null,
                redirectTo,
              ),
            );
          } catch {
            router.push(redirectTo);
          }
        } else {
          setIsChecking(false);
        }
      } catch (err) {
        setIsChecking(false);
      }
    };

    void checkSession();
  }, [supabase, redirectTo, router]);

  useEffect(() => {
    if (session?.user && !isChecking) {
      void (async () => {
        try {
          const prefsRes = await fetch("/api/profile/preferences");
          const prefs = prefsRes.ok ? await prefsRes.json() : null;
          const { resolvePostAuthPath } = await import("@/lib/onboarding/redirect");
          router.push(
            resolvePostAuthPath(
              prefs
                ? {
                    username: prefs.username ?? null,
                    onboarding_completed: prefs.onboarding_completed ?? null,
                  }
                : null,
              redirectTo,
            ),
          );
        } catch {
          router.push(redirectTo);
        }
      })();
    }
  }, [session, redirectTo, router, isChecking]);

  const buildAuthUrl = (nextMode: AuthMode) => {
    const params = new URLSearchParams();
    params.set("mode", nextMode);
    if (redirectTo !== "/past-papers/library") {
      params.set("redirectTo", redirectTo);
    }
    const qs = params.toString();
    return qs ? `/login?${qs}` : "/login";
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode === "signup") {
        try {
          sessionStorage.setItem("ga_pending_signup", "1");
        } catch {
          /* ignore */
        }
      }

      const { error: signInError } = await signInWithGoogle(supabase, redirectTo);

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (session?.user || isChecking) {
    return null;
  }

  const alternateMode: AuthMode = mode === "signin" ? "signup" : "signin";

  return (
    <Container size="lg">
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
        <div className="w-full max-w-[400px]">
          <div className="overflow-hidden rounded-organic-xl border border-border-subtle bg-surface">
            <div className="flex border-b border-border-subtle">
              {(["signin", "signup"] as const).map((tab) => (
                <Link
                  key={tab}
                  href={buildAuthUrl(tab)}
                  className={cn(
                    "flex-1 py-3.5 text-center text-sm font-medium transition-colors",
                    mode === tab
                      ? "bg-surface-mid text-text"
                      : "text-text-muted hover:bg-surface-subtle hover:text-text",
                  )}
                  aria-current={mode === tab ? "page" : undefined}
                >
                  {tab === "signin" ? "Sign in" : "Sign up"}
                </Link>
              ))}
            </div>

            <div className="space-y-6 px-6 py-8 sm:px-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <BrandLogo variant="full" size="lg" />
                <div className="space-y-1.5">
                  <h1 className="text-xl font-semibold tracking-tight text-text">
                    {copy.title}
                  </h1>
                  <p className="text-sm leading-relaxed text-text-muted">
                    {copy.subtitle}
                  </p>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-organic-md border border-error/25 bg-error/10 px-4 py-3 text-sm text-error"
                >
                  {error}
                </div>
              )}

              <GoogleAuthButton
                mode={mode}
                loading={loading}
                onClick={handleGoogleAuth}
              />

              <p className="text-center text-sm text-text-muted">
                {mode === "signup" ? (
                  <Link
                    href={buildAuthUrl("signin")}
                    className="font-medium text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                  >
                    I already have an account
                  </Link>
                ) : (
                  <>
                    {copy.switchPrompt}{" "}
                    <Link
                      href={buildAuthUrl(alternateMode)}
                      className="font-medium text-text underline-offset-2 hover:underline"
                    >
                      {copy.switchLabel}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-text-subtle">
            By continuing, you agree to our use of Google sign-in to authenticate
            your account.
          </p>
        </div>
      </div>
    </Container>
  );
}
