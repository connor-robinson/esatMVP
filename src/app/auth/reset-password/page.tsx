"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useSupabaseClient,
  useSupabaseSession,
} from "@/components/auth/SupabaseSessionProvider";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";
import { mapAuthError } from "@/lib/auth/errors";
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordConfirmation,
} from "@/lib/auth/password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const session = useSupabaseSession();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const waitForSession = async () => {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (current?.user) {
        setHasSession(true);
        setReady(true);
        return;
      }

      window.setTimeout(async () => {
        if (cancelled) return;
        const {
          data: { session: delayed },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        setHasSession(Boolean(delayed?.user));
        setReady(true);
      }, 800);
    };

    void waitForSession();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (session?.user) {
      setHasSession(true);
      setReady(true);
    }
  }, [session]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const check = validatePasswordConfirmation(password, confirmPassword);
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(
          payload?.error ||
            "Could not update your password. Request a new reset link.",
        );
        return;
      }

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
            "/",
          ),
        );
        router.refresh();
      } catch {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError(mapAuthError(err, "Could not update your password."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <AuthPageShell title="Reset your password" subtitle="Checking your reset link…">
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-subtle border-t-text" />
        </div>
      </AuthPageShell>
    );
  }

  if (!hasSession) {
    return (
      <AuthPageShell
        title="Link expired"
        subtitle="This password reset link is invalid or has already been used. Request a new one to continue."
      >
        <Link
          href="/login/forgot"
          className="block text-center text-sm font-medium text-text underline-offset-2 hover:underline"
        >
          Request a new reset link
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Use at least 8 characters. You’ll be signed in after saving."
    >
      {error ? (
        <div
          role="alert"
          className="rounded-organic-md bg-error/10 px-4 py-3 text-sm text-error"
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <PasswordInput
          id="new-password"
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          disabled={submitting}
        />
        <PasswordInput
          id="confirm-new-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          disabled={submitting}
        />
        <Button
          type="submit"
          variant="primary"
          className="h-11 w-full"
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save password"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
