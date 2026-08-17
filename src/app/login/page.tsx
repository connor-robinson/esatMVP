/**
 * Login / sign-up — email + password, or Google OAuth.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  useSupabaseClient,
  useSupabaseSession,
} from "@/components/auth/SupabaseSessionProvider";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { EmailPasswordForm } from "@/components/auth/EmailPasswordForm";
import {
  GoogleAuthButton,
  type GoogleAuthMode,
} from "@/components/auth/GoogleAuthButton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { signInWithGoogle } from "@/lib/auth/googleOAuth";
import { mapAuthError } from "@/lib/auth/errors";

type AuthMode = GoogleAuthMode;

const COPY: Record<AuthMode, { title: string; subtitle: string }> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to save progress and sync across devices.",
  },
  signup: {
    title: "Sign up for free",
    subtitle:
      "Create an account to save sessions, unlock results, and pick up where you left off.",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  const mode: AuthMode = useMemo(() => {
    const fromUrl = searchParams.get("mode");
    return fromUrl === "signup" ? "signup" : "signin";
  }, [searchParams]);

  const redirectTo = searchParams.get("redirectTo") || "/";
  const copy = COPY[mode];

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
    if (searchParams.get("method") === "email") {
      setEmailOpen(true);
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
            const { resolvePostAuthPath } = await import(
              "@/lib/onboarding/redirect"
            );
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
      } catch {
        setIsChecking(false);
      }
    };

    void checkSession();
  }, [supabase, redirectTo, router]);

  useEffect(() => {
    if (session?.user && !isChecking && !pendingEmail) {
      void (async () => {
        try {
          const prefsRes = await fetch("/api/profile/preferences");
          const prefs = prefsRes.ok ? await prefsRes.json() : null;
          const { resolvePostAuthPath } = await import(
            "@/lib/onboarding/redirect"
          );
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
  }, [session, redirectTo, router, isChecking, pendingEmail]);

  const buildAuthUrl = (nextMode: AuthMode, withEmail = emailOpen) => {
    const params = new URLSearchParams();
    params.set("mode", nextMode);
    if (redirectTo !== "/") {
      params.set("redirectTo", redirectTo);
    }
    if (withEmail) {
      params.set("method", "email");
    }
    const qs = params.toString();
    return qs ? `/login?${qs}` : "/login";
  };

  const toggleEmail = () => {
    const next = !emailOpen;
    setEmailOpen(next);
    setError(null);
    router.replace(buildAuthUrl(mode, next), { scroll: false });
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      if (mode === "signup") {
        try {
          sessionStorage.setItem("ga_pending_signup", "1");
        } catch {
          /* ignore */
        }
      }

      const { error: signInError } = await signInWithGoogle(
        supabase,
        redirectTo,
      );

      if (signInError) {
        setError(mapAuthError(signInError, signInError.message));
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(mapAuthError(err, "Something went wrong"));
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResendBusy(true);
    setResendMessage(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      });
      if (resendError) {
        setResendMessage(mapAuthError(resendError, resendError.message));
      } else {
        setResendMessage("Another email is on its way.");
      }
    } catch (err) {
      setResendMessage(mapAuthError(err, "Could not resend the email."));
    } finally {
      setResendBusy(false);
    }
  };

  if ((session?.user && !pendingEmail) || isChecking) {
    return null;
  }

  if (pendingEmail) {
    return (
      <AuthPageShell
        title="Check your email"
        subtitle={`We sent a confirmation link to ${pendingEmail}. Open it to finish creating your account.`}
        footer="Didn't get it? Check spam, or resend the email."
      >
        <div className="space-y-3">
          {resendMessage ? (
            <p className="text-center text-sm text-text-muted">{resendMessage}</p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            className="h-11 w-full"
            onClick={() => void handleResend()}
            disabled={resendBusy}
          >
            {resendBusy ? "Sending…" : "Resend email"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-text-muted hover:text-text"
            onClick={() => {
              setPendingEmail(null);
              setResendMessage(null);
            }}
          >
            Use a different email
          </button>
          <Link
            href={buildAuthUrl("signin")}
            className="block w-full text-center text-sm text-text-muted hover:text-text"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title={copy.title}
      subtitle={copy.subtitle}
      tabs={
        <div className="flex bg-surface-subtle">
          {(["signin", "signup"] as const).map((tab) => (
            <Link
              key={tab}
              href={buildAuthUrl(tab)}
              className={cn(
                "flex-1 py-3.5 text-center text-sm font-medium transition-colors",
                mode === tab
                  ? "bg-surface text-text"
                  : "text-text-muted hover:text-text",
              )}
              aria-current={mode === tab ? "page" : undefined}
            >
              {tab === "signin" ? "Sign in" : "Sign up"}
            </Link>
          ))}
        </div>
      }
      footer="By continuing, you create or access an ESAT CAMP account."
    >
      {error && !emailOpen ? (
        <div
          role="alert"
          className="rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      ) : null}

      <GoogleAuthButton
        mode={mode}
        loading={googleLoading}
        onClick={handleGoogleAuth}
      />

      <div className="space-y-3">
        <button
          type="button"
          onClick={toggleEmail}
          aria-expanded={emailOpen}
          aria-controls="email-auth-panel"
          className="flex w-full items-center justify-center gap-1.5 py-1 text-sm text-text-muted transition-colors hover:text-text"
        >
          <span>
            {mode === "signup" ? "Or sign up with email" : "Or sign in with email"}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              emailOpen && "rotate-180",
            )}
          />
        </button>

        <div
          id="email-auth-panel"
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            emailOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div
              className="space-y-4 pt-1"
              inert={!emailOpen ? true : undefined}
              aria-hidden={!emailOpen}
            >
              {error && emailOpen ? (
                <div
                  role="alert"
                  className="rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error"
                >
                  {error}
                </div>
              ) : null}
              <EmailPasswordForm
                mode={mode}
                redirectTo={redirectTo}
                disabled={googleLoading || !emailOpen}
                onError={setError}
                onCheckEmail={setPendingEmail}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
